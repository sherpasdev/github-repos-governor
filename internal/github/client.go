package github

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github-repos-governor/internal/config"
	"github-repos-governor/internal/models"
)

type ConfigError struct {
	Message string
}

func (e *ConfigError) Error() string {
	return e.Message
}

type RequestError struct {
	Status int
	Body   string
}

func (e *RequestError) Error() string {
	return fmt.Sprintf("github api error: status=%d body=%s", e.Status, e.Body)
}

type Client struct {
	cfg  config.Config
	http *http.Client
}

func NewClient(cfg config.Config) *Client {
	return &Client{
		cfg:  cfg,
		http: &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) ensureConfig() error {
	missing := config.MissingFields(c.cfg)
	if len(missing) > 0 {
		return &ConfigError{Message: "missing required configuration fields: " + strings.Join(missing, ", ")}
	}
	return nil
}

func (c *Client) buildURL(path string, params url.Values) (string, error) {
	base := strings.TrimRight(c.cfg.GithubAPIBaseURL, "/")
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	if len(params) == 0 {
		return base + path, nil
	}
	return base + path + "?" + params.Encode(), nil
}

func (c *Client) doRequest(ctx context.Context, method, path string, params url.Values, body any) (*http.Response, error) {
	if err := c.ensureConfig(); err != nil {
		return nil, err
	}

	urlStr, err := c.buildURL(path, params)
	if err != nil {
		return nil, err
	}

	var buf io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		buf = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, urlStr, buf)
	if err != nil {
		return nil, err
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Authorization", "Bearer "+c.cfg.GithubToken)
	req.Header.Set("User-Agent", c.cfg.UserAgent)
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		defer func() {
			_ = resp.Body.Close()
		}()
		data, _ := io.ReadAll(resp.Body)
		return nil, &RequestError{
			Status: resp.StatusCode,
			Body:   string(data),
		}
	}

	return resp, nil
}

func decodeResponse[T any](resp *http.Response) (T, map[string][]string, error) {
	defer func() {
		_ = resp.Body.Close()
	}()
	var out T
	if resp.ContentLength == 0 {
		return out, resp.Header, nil
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return out, resp.Header, err
	}
	if len(data) == 0 {
		return out, resp.Header, nil
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return out, resp.Header, err
	}
	return out, resp.Header, nil
}

func parseRateLimit(headers map[string][]string) models.RateLimitInfo {
	info := models.RateLimitInfo{}
	if value := headerFirst(headers, "X-RateLimit-Remaining"); value != "" {
		if n, err := strconv.Atoi(value); err == nil {
			info.Remaining = &n
		}
	}
	if value := headerFirst(headers, "X-RateLimit-Limit"); value != "" {
		if n, err := strconv.Atoi(value); err == nil {
			info.Limit = &n
		}
	}
	if value := headerFirst(headers, "X-RateLimit-Reset"); value != "" {
		if n, err := strconv.Atoi(value); err == nil {
			info.Reset = &n
		}
	}
	return info
}

func headerFirst(headers map[string][]string, key string) string {
	if values, ok := headers[key]; ok && len(values) > 0 {
		return values[0]
	}
	return ""
}

func parseLinkHeader(value string) (hasNext, hasPrev bool) {
	for _, part := range strings.Split(value, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		segments := strings.Split(part, ";")
		if len(segments) < 2 {
			continue
		}
		urlPart := strings.TrimSpace(strings.Trim(segments[0], "<>"))
		rel := ""
		for _, segment := range segments[1:] {
			segment = strings.TrimSpace(segment)
			if strings.HasPrefix(segment, "rel=\"") && strings.HasSuffix(segment, "\"") {
				rel = segment[5 : len(segment)-1]
				break
			}
		}
		switch rel {
		case "next":
			hasNext = urlPart != ""
		case "prev":
			hasPrev = urlPart != ""
		}
	}
	return
}

func (c *Client) ListOrganizationRepos(ctx context.Context, opts RepoListOptions) (*RepoListResult, error) {
	if opts.PerPage <= 0 {
		opts.PerPage = 50
	}
	if opts.Page <= 0 {
		opts.Page = 1
	}
	if opts.Sort == "" {
		opts.Sort = "updated"
	}
	if opts.Direction != "asc" {
		opts.Direction = "desc"
	}
	if opts.Type == "" {
		opts.Type = "all"
	}

	params := url.Values{}
	params.Set("per_page", strconv.Itoa(opts.PerPage))
	params.Set("page", strconv.Itoa(opts.Page))
	params.Set("sort", opts.Sort)
	params.Set("direction", opts.Direction)
	params.Set("type", opts.Type)

	resp, err := c.doRequest(ctx, http.MethodGet, fmt.Sprintf("/orgs/%s/repos", c.cfg.GithubOrg), params, nil)
	if err != nil {
		return nil, err
	}

	data, headers, err := decodeResponse[[]Repository](resp)
	if err != nil {
		return nil, err
	}

	if c.cfg.IgnoreArchived {
		data = filterArchivedRepositories(data)
	}

	rateLimit := parseRateLimit(headers)
	linkHeader := headerFirst(headers, "Link")
	hasNext, hasPrev := parseLinkHeader(linkHeader)

	return &RepoListResult{
		Repositories: data,
		RateLimit:    rateLimit,
		HasNextPage:  hasNext,
		HasPrevPage:  hasPrev,
	}, nil
}

func (c *Client) ListAllOrganizationRepos(ctx context.Context) ([]Repository, models.RateLimitInfo, error) {
	return c.ListAllOrganizationReposWithLog(ctx, nil)
}

func (c *Client) ListAllOrganizationReposWithLog(ctx context.Context, logger func(string)) ([]Repository, models.RateLimitInfo, error) {
	var all []Repository
	var rateLimit models.RateLimitInfo
	page := 1

	for {
		if logger != nil {
			logger(fmt.Sprintf("Fetching repository page %d", page))
		}
		result, err := c.ListOrganizationRepos(ctx, RepoListOptions{
			Page:      page,
			PerPage:   100,
			Sort:      "updated",
			Direction: "desc",
			Type:      "all",
		})
		if err != nil {
			return nil, models.RateLimitInfo{}, err
		}

		all = append(all, result.Repositories...)
		rateLimit = result.RateLimit

		if logger != nil {
			logger(fmt.Sprintf("Received %d repositories (total so far: %d)", len(result.Repositories), len(all)))
		}

		if !result.HasNextPage || len(result.Repositories) == 0 {
			break
		}
		page++
	}

	return all, rateLimit, nil
}

func (c *Client) GetRepository(ctx context.Context, repoName string) (Repository, models.RateLimitInfo, error) {
	resp, err := c.doRequest(ctx, http.MethodGet, fmt.Sprintf("/repos/%s/%s", c.cfg.GithubOrg, repoName), nil, nil)
	if err != nil {
		return Repository{}, models.RateLimitInfo{}, err
	}

	data, headers, err := decodeResponse[Repository](resp)
	if err != nil {
		return Repository{}, models.RateLimitInfo{}, err
	}

	return data, parseRateLimit(headers), nil
}

func filterArchivedRepositories(repos []Repository) []Repository {
	if len(repos) == 0 {
		return repos
	}

	var archivedCount int
	for _, repo := range repos {
		if repo.Archived {
			archivedCount++
		}
	}
	if archivedCount == 0 {
		return repos
	}

	filtered := make([]Repository, 0, len(repos)-archivedCount)
	for _, repo := range repos {
		if repo.Archived {
			continue
		}
		filtered = append(filtered, repo)
	}
	return filtered
}

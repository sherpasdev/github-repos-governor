package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github-repos-governor/internal/cache"
	"github-repos-governor/internal/config"
	"github-repos-governor/internal/github"
	"github-repos-governor/internal/models"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx          context.Context
	cfg          config.Config
	cfgErr       error
	client       *github.Client
	cacheManager *cache.Manager
	baseDir      string
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.initialise()
}

func (a *App) initialise() {
	if dir, err := os.Getwd(); err == nil {
		a.baseDir = dir
	} else {
		a.baseDir = "."
	}

	cfg, err := config.Load()
	if err != nil {
		a.cfgErr = err
		return
	}

	a.cfgErr = nil
	a.cfg = cfg
	a.client = github.NewClient(a.cfg)

	cacheDir := a.cfg.CacheDir
	if !filepath.IsAbs(cacheDir) {
		cacheDir = filepath.Join(a.baseDir, cacheDir)
	}

	if manager, err := cache.NewManager(cacheDir); err == nil {
		a.cacheManager = manager
	}
}

type EnvironmentStatus struct {
	Ready        bool     `json:"ready"`
	Missing      []string `json:"missing"`
	Organization *string  `json:"organization"`
	APIBaseURL   string   `json:"apiBaseUrl"`
	ConfigPath   string   `json:"configPath"`
	LoadError    string   `json:"loadError"`
	Version      string   `json:"version"`
}

type SettingsPayload struct {
	GithubToken      string `json:"githubToken"`
	GithubOrg        string `json:"githubOrg"`
	GithubAPIBaseURL string `json:"githubApiBaseUrl"`
	DisableCache     bool   `json:"disableCache"`
	CacheDir         string `json:"cacheDir"`
	IgnoreArchived   bool   `json:"ignoreArchived"`
	ConfigPath       string `json:"configPath"`
}

func (a *App) EnvironmentStatus() EnvironmentStatus {
	var missing []string
	var loadErr string

	if a.cfgErr != nil {
		loadErr = a.cfgErr.Error()
	} else {
		missing = config.MissingFields(a.cfg)
	}

	var org *string
	if a.cfg.GithubOrg != "" {
		value := a.cfg.GithubOrg
		org = &value
	}

	apiBase := a.cfg.GithubAPIBaseURL
	if apiBase == "" {
		apiBase = "https://api.github.com"
	}

	return EnvironmentStatus{
		Ready:        a.cfgErr == nil && len(missing) == 0,
		Missing:      missing,
		Organization: org,
		APIBaseURL:   apiBase,
		ConfigPath:   a.cfg.SourcePath,
		LoadError:    loadErr,
		Version:      buildVersion(),
	}
}

func (a *App) GetSettings() (*SettingsPayload, error) {
	path := a.cfg.SourcePath
	if path == "" {
		// fall back to default config path relative to base dir
		path = filepath.Join(a.baseDir, "config", "config.json")
	}

	return &SettingsPayload{
		GithubToken:      a.cfg.GithubToken,
		GithubOrg:        a.cfg.GithubOrg,
		GithubAPIBaseURL: a.cfg.GithubAPIBaseURL,
		DisableCache:     a.cfg.DisableCache,
		CacheDir:         a.cfg.CacheDir,
		IgnoreArchived:   a.cfg.IgnoreArchived,
		ConfigPath:       path,
	}, nil
}

func (a *App) SaveSettings(payload SettingsPayload) error {
	path := strings.TrimSpace(payload.ConfigPath)
	if path == "" {
		path = a.cfg.SourcePath
	}
	if path == "" {
		return errors.New("configuration path is unknown")
	}

	cfg := config.Config{
		GithubToken:      strings.TrimSpace(payload.GithubToken),
		GithubOrg:        strings.TrimSpace(payload.GithubOrg),
		GithubAPIBaseURL: strings.TrimSpace(payload.GithubAPIBaseURL),
		DisableCache:     payload.DisableCache,
		CacheDir:         strings.TrimSpace(payload.CacheDir),
		IgnoreArchived:   payload.IgnoreArchived,
	}

	if err := config.Save(path, cfg); err != nil {
		return err
	}

	config.Reload()
	a.initialise()
	return nil
}

type RepoListRequest struct {
	Page       int    `json:"page"`
	PerPage    int    `json:"perPage"`
	Search     string `json:"search"`
	Sort       string `json:"sort"`
	Direction  string `json:"direction"`
	Visibility string `json:"visibility"`
}

type RepoListResponse struct {
	Items        []models.RepoSummary `json:"items"`
	Pagination   RepoPagination       `json:"pagination"`
	Filters      RepoListFilters      `json:"filters"`
	RateLimit    models.RateLimitInfo `json:"rateLimit"`
	Organization *string              `json:"organization"`
	FetchedAt    string               `json:"fetchedAt"`
}

type RepoPagination struct {
	Page        int  `json:"page"`
	PerPage     int  `json:"perPage"`
	HasNextPage bool `json:"hasNextPage"`
	HasPrevPage bool `json:"hasPrevPage"`
}

type RepoListFilters struct {
	Search     *string `json:"search"`
	Sort       string  `json:"sort"`
	Direction  string  `json:"direction"`
	Visibility string  `json:"visibility"`
}

func (a *App) ListRepositories(req RepoListRequest) (*RepoListResponse, error) {
	if a.client == nil {
		return nil, errors.New("github client not initialised")
	}

	filters := normaliseRepoFilters(req)
	ctx, cancel := context.WithTimeout(a.ctx, 45*time.Second)
	defer cancel()

	result, err := a.client.ListOrganizationRepos(ctx, github.RepoListOptions{
		Page:      filters.Page,
		PerPage:   filters.PerPage,
		Sort:      filters.APISort,
		Direction: filters.Direction,
		Type:      filters.APIVisibility,
	})
	if err != nil {
		return nil, err
	}

	filtered := applySearchFilter(result.Repositories, filters.Search)
	sortRepositories(filtered, filters.Sort, filters.Direction)

	summaries := make([]models.RepoSummary, 0, len(filtered))
	for _, repo := range filtered {
		summaries = append(summaries, github.MapToRepoSummary(repo))
	}

	var searchPtr *string
	if filters.Search != "" {
		searchPtr = &filters.Search
	}

	org := optionalString(a.cfg.GithubOrg)

	return &RepoListResponse{
		Items: summaries,
		Pagination: RepoPagination{
			Page:        filters.Page,
			PerPage:     filters.PerPage,
			HasNextPage: result.HasNextPage,
			HasPrevPage: result.HasPrevPage,
		},
		Filters: RepoListFilters{
			Search:     searchPtr,
			Sort:       filters.Sort,
			Direction:  filters.Direction,
			Visibility: filters.Visibility,
		},
		RateLimit:    result.RateLimit,
		Organization: org,
		FetchedAt:    time.Now().UTC().Format(time.RFC3339),
	}, nil
}

type RepoListRuntimeFilters struct {
	Page          int
	PerPage       int
	Search        string
	Sort          string
	Direction     string
	Visibility    string
	APISort       string
	APIVisibility string
}

func normaliseRepoFilters(req RepoListRequest) RepoListRuntimeFilters {
	page := req.Page
	if page <= 0 {
		page = 1
	}

	perPage := req.PerPage
	if perPage <= 0 {
		perPage = 50
	}
	if perPage > 100 {
		perPage = 100
	}

	sortKey := sanitiseSort(req.Sort)
	direction := sanitiseDirection(req.Direction)
	visibility := sanitiseVisibility(req.Visibility)
	search := strings.TrimSpace(req.Search)

	apiSort := mapSortToAPI(sortKey)
	apiVisibility := mapVisibilityToAPI(visibility)

	return RepoListRuntimeFilters{
		Page:          page,
		PerPage:       perPage,
		Search:        search,
		Sort:          sortKey,
		Direction:     direction,
		Visibility:    visibility,
		APISort:       apiSort,
		APIVisibility: apiVisibility,
	}
}

func sanitiseDirection(input string) string {
	if strings.ToLower(input) == "asc" {
		return "asc"
	}
	return "desc"
}

func sanitiseSort(input string) string {
	switch strings.ToLower(input) {
	case "pushed", "created", "name", "stars", "forks", "issues", "size":
		return strings.ToLower(input)
	default:
		return "updated"
	}
}

func sanitiseVisibility(input string) string {
	switch strings.ToLower(input) {
	case "public", "private", "internal", "forks", "sources":
		return strings.ToLower(input)
	default:
		return "all"
	}
}

func mapSortToAPI(sort string) string {
	switch sort {
	case "pushed", "created":
		return sort
	case "name":
		return "full_name"
	default:
		return "updated"
	}
}

func mapVisibilityToAPI(visibility string) string {
	if visibility == "" {
		return "all"
	}
	return visibility
}

func applySearchFilter(repos []github.Repository, term string) []github.Repository {
	if term == "" {
		return repos
	}

	lower := strings.ToLower(term)
	filtered := make([]github.Repository, 0, len(repos))
	for _, repo := range repos {
		if matchesSearch(repo, lower) {
			filtered = append(filtered, repo)
		}
	}
	return filtered
}

func matchesSearch(repo github.Repository, term string) bool {
	candidates := []string{
		repo.Name,
		repo.FullName,
	}
	if repo.Description != nil {
		candidates = append(candidates, *repo.Description)
	}
	if repo.Language != nil {
		candidates = append(candidates, *repo.Language)
	}
	candidates = append(candidates, repo.Topics...)

	for _, candidate := range candidates {
		if strings.Contains(strings.ToLower(candidate), term) {
			return true
		}
	}
	return false
}

func sortRepositories(repos []github.Repository, sortKey, direction string) {
	order := 1
	if direction == "desc" {
		order = -1
	}

	comparator := buildComparator(sortKey)
	sort.SliceStable(repos, func(i, j int) bool {
		cmp := comparator(repos[i], repos[j])
		if cmp == 0 {
			return strings.ToLower(repos[i].Name) < strings.ToLower(repos[j].Name)
		}
		if order > 0 {
			return cmp < 0
		}
		return cmp > 0
	})
}

func buildComparator(sortKey string) func(a, b github.Repository) int {
	switch sortKey {
	case "name":
		return func(a, b github.Repository) int {
			return strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name))
		}
	case "created":
		return func(a, b github.Repository) int {
			return compareTime(a.CreatedAt, b.CreatedAt)
		}
	case "pushed":
		return func(a, b github.Repository) int {
			return compareTime(a.PushedAt, b.PushedAt)
		}
	case "stars":
		return func(a, b github.Repository) int {
			return compareInt(a.Stargazers, b.Stargazers)
		}
	case "forks":
		return func(a, b github.Repository) int {
			return compareInt(a.Forks, b.Forks)
		}
	case "issues":
		return func(a, b github.Repository) int {
			return compareInt(a.OpenIssues, b.OpenIssues)
		}
	case "size":
		return func(a, b github.Repository) int {
			return compareInt(a.Size, b.Size)
		}
	default:
		return func(a, b github.Repository) int {
			return compareTime(a.UpdatedAt, b.UpdatedAt)
		}
	}
}

func compareInt(a, b int) int {
	switch {
	case a < b:
		return -1
	case a > b:
		return 1
	default:
		return 0
	}
}

func compareTime(a, b string) int {
	ta, errA := time.Parse(time.RFC3339, a)
	tb, errB := time.Parse(time.RFC3339, b)
	if errA != nil && errB != nil {
		return 0
	}
	if errA != nil {
		return -1
	}
	if errB != nil {
		return 1
	}
	switch {
	case ta.Before(tb):
		return -1
	case ta.After(tb):
		return 1
	default:
		return 0
	}
}

func optionalString(value string) *string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	copied := value
	return &copied
}

func ptr[T any](value T) *T {
	return &value
}

func logf(logger func(string), format string, args ...interface{}) {
	if logger == nil {
		return
	}
	logger(fmt.Sprintf(format, args...))
}

type RepoDetailResponse struct {
	Repository   models.RepoDetail    `json:"repository"`
	Organization *string              `json:"organization"`
	RateLimit    models.RateLimitInfo `json:"rateLimit"`
	FetchedAt    string               `json:"fetchedAt"`
}

func (a *App) GetRepositoryDetail(repoName string) (*RepoDetailResponse, error) {
	if a.client == nil {
		return nil, errors.New("github client not initialised")
	}

	ctx, cancel := context.WithTimeout(a.ctx, 30*time.Second)
	defer cancel()

	repo, rateLimit, err := a.client.GetRepository(ctx, repoName)
	if err != nil {
		return nil, err
	}

	detail := github.MapToRepoDetail(repo)
	return &RepoDetailResponse{
		Repository:   detail,
		Organization: optionalString(a.cfg.GithubOrg),
		RateLimit:    rateLimit,
		FetchedAt:    time.Now().UTC().Format(time.RFC3339),
	}, nil
}

type RepoSummaryResponse struct {
	Summary      models.RepoSnapshot  `json:"summary"`
	Count        int                  `json:"count"`
	Organization *string              `json:"organization"`
	RateLimit    models.RateLimitInfo `json:"rateLimit"`
	FetchedAt    string               `json:"fetchedAt"`
	Cache        CacheMetadata        `json:"cache"`
}

type CacheMetadata struct {
	Available bool    `json:"available"`
	CreatedAt *string `json:"createdAt"`
	Refreshed bool    `json:"refreshed"`
}

type summaryOptions struct {
	Force  bool
	Logger func(string)
}

func (a *App) GetOrganizationSummary() (*RepoSummaryResponse, error) {
	ctx, cancel := context.WithTimeout(a.ctx, 2*time.Minute)
	defer cancel()

	snapshot, rateLimit, meta, err := a.loadOrganizationSummary(ctx, summaryOptions{Force: false})
	if err != nil {
		return nil, err
	}

	org := a.cfg.GithubOrg

	return &RepoSummaryResponse{
		Summary:      *snapshot,
		Count:        snapshot.Totals.Repos,
		Organization: optionalString(org),
		RateLimit:    rateLimit,
		FetchedAt:    time.Now().UTC().Format(time.RFC3339),
		Cache:        meta,
	}, nil
}

type RefreshSummaryResponse struct {
	Summary      models.RepoSnapshot  `json:"summary"`
	Count        int                  `json:"count"`
	Organization *string              `json:"organization"`
	RateLimit    models.RateLimitInfo `json:"rateLimit"`
	FetchedAt    string               `json:"fetchedAt"`
	Logs         []string             `json:"logs"`
}

func (a *App) RefreshOrganizationSummary() (*RefreshSummaryResponse, error) {
	ctx, cancel := context.WithTimeout(a.ctx, 5*time.Minute)
	defer cancel()

	logger := newRefreshLogger(a.ctx)
	logger.Logf("Starting refresh for organization %s", a.cfg.GithubOrg)

	snapshot, rateLimit, _, err := a.loadOrganizationSummary(ctx, summaryOptions{Force: true, Logger: logger.Log})
	if err != nil {
		logger.Logf("Refresh failed: %v", err)
		return nil, err
	}

	logger.Logf("Refresh complete. Cached at %s", time.Now().UTC().Format(time.RFC3339))

	org := a.cfg.GithubOrg
	return &RefreshSummaryResponse{
		Summary:      *snapshot,
		Count:        snapshot.Totals.Repos,
		Organization: optionalString(org),
		RateLimit:    rateLimit,
		FetchedAt:    time.Now().UTC().Format(time.RFC3339),
		Logs:         logger.Entries(),
	}, nil
}

type refreshLogger struct {
	ctx     context.Context
	entries []string
}

func newRefreshLogger(ctx context.Context) *refreshLogger {
	return &refreshLogger{ctx: ctx, entries: make([]string, 0, 32)}
}

func (l *refreshLogger) Log(message string) {
	l.entries = append(l.entries, message)
	if l.ctx != nil {
		runtime.EventsEmit(l.ctx, "governor:refresh-log", message)
	}
}

func (l *refreshLogger) Logf(format string, args ...interface{}) {
	l.Log(fmt.Sprintf(format, args...))
}

func (l *refreshLogger) Entries() []string {
	copied := make([]string, len(l.entries))
	copy(copied, l.entries)
	return copied
}

func (a *App) loadOrganizationSummary(ctx context.Context, opts summaryOptions) (*models.RepoSnapshot, models.RateLimitInfo, CacheMetadata, error) {
	if a.client == nil {
		return nil, models.RateLimitInfo{}, CacheMetadata{}, errors.New("github client not initialised")
	}

	log := opts.Logger
	org := a.cfg.GithubOrg

	if !opts.Force {
		logf(log, "Attempting to use cached summary")
	}

	if !opts.Force && org != "" && a.cacheManager != nil && !a.cfg.DisableCache {
		if entry, err := cache.ReadLatest[models.RepoSnapshot](a.cacheManager, org); err == nil && entry != nil {
			if entry.Payload.Version == models.SnapshotVersion {
				logf(log, "Cache hit: snapshot from %s", entry.CreatedAt.Format(time.RFC3339))
				meta := CacheMetadata{
					Available: true,
					CreatedAt: ptr(entry.CreatedAt.UTC().Format(time.RFC3339)),
					Refreshed: false,
				}
				return &entry.Payload, models.RateLimitInfo{}, meta, nil
			}
		}
	}

	logf(log, "Fetching repositories from GitHub")

	repos, rateLimit, err := a.client.ListAllOrganizationReposWithLog(ctx, opts.Logger)
	if err != nil {
		return nil, models.RateLimitInfo{}, CacheMetadata{}, err
	}

	logf(log, "Mapping repository summaries")
	summaries := make([]models.RepoSummary, 0, len(repos))
	for _, repo := range repos {
		summaries = append(summaries, github.MapToRepoSummary(repo))
	}

	logf(log, "Building organization snapshot")
	snapshot, err := a.client.BuildOrganizationSnapshot(ctx, repos, summaries)
	if err != nil {
		return nil, models.RateLimitInfo{}, CacheMetadata{}, err
	}

	meta := CacheMetadata{
		Available: false,
		CreatedAt: nil,
		Refreshed: true,
	}

	if org != "" && a.cacheManager != nil && !a.cfg.DisableCache {
		logf(log, "Writing snapshot to cache")
		if path, err := cache.Write(a.cacheManager, org, *snapshot); err != nil {
			fmt.Fprintf(os.Stderr, "cache write error: %v\n", err)
			logf(log, "Cache write failed: %v", err)
		} else {
			logf(log, "Cache saved to %s", path)
			stamp := time.Now().UTC().Format(time.RFC3339)
			meta.Available = true
			meta.CreatedAt = &stamp
		}
	}

	return snapshot, rateLimit, meta, nil
}

func (a *App) ApplyGovernanceActions(req github.GovernanceActionRequest) (*github.GovernanceResponse, error) {
	if a.client == nil {
		return nil, errors.New("github client not initialised")
	}

	ctx, cancel := context.WithTimeout(a.ctx, 5*time.Minute)
	defer cancel()

	var provider *github.CacheProvider
	if a.cacheManager != nil && !a.cfg.DisableCache {
		provider = github.NewCacheProvider(a.cacheManager, a.cfg.GithubOrg)
	}

	return a.client.ApplyGovernanceActions(ctx, req, provider)
}

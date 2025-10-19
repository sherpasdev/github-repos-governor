package github

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github-repos-governor/internal/cache"
	"github-repos-governor/internal/models"
)

func (c *Client) renameDefaultBranch(ctx context.Context, repo Repository, target string) GovernanceActionResult {
	action := GovernanceActionResult{
		Repo:   repo.FullName,
		Action: "renameDefaultBranch",
	}

	if c.cfg.GithubOrg == "" {
		message := "missing githubOrg configuration"
		action.Success = false
		action.Message = &message
		return action
	}

	if repo.DefaultBranch == target {
		message := "already using target branch name"
		action.Success = true
		action.Message = &message
		return action
	}

	payload := map[string]string{"new_name": target}
	_, err := c.doRequest(ctx, http.MethodPost, fmt.Sprintf("/repos/%s/%s/branches/%s/rename", c.cfg.GithubOrg, repo.Name, repo.DefaultBranch), nil, payload)
	if err != nil {
		message := errorMessage(err)
		action.Success = false
		action.Message = &message
		return action
	}

	action.Success = true
	return action
}

func (c *Client) applyBranchProtection(ctx context.Context, repo Repository, options BranchProtectionOptions) GovernanceActionResult {
	action := GovernanceActionResult{
		Repo:   repo.FullName,
		Action: "branchProtection",
	}

	if c.cfg.GithubOrg == "" {
		message := "missing githubOrg configuration"
		action.Success = false
		action.Message = &message
		return action
	}

	request := map[string]any{
		"enforce_admins": true,
		"allow_force_pushes": map[string]any{
			"enabled": !options.RestrictForcePushes,
		},
		"allow_deletions": map[string]any{
			"enabled": false,
		},
	}

	if len(options.StatusCheckContexts) > 0 {
		request["required_status_checks"] = map[string]any{
			"strict":   options.StrictStatusChecks,
			"contexts": options.StatusCheckContexts,
		}
	} else {
		request["required_status_checks"] = nil
	}

	request["required_pull_request_reviews"] = map[string]any{
		"dismiss_stale_reviews":           options.DismissStaleReviews,
		"require_code_owner_reviews":      options.RequireCodeOwners,
		"required_approving_review_count": max(0, options.ApprovalsRequired),
		"require_last_push_approval":      options.RequireUpToDate != nil && *options.RequireUpToDate,
	}

	request["restrictions"] = nil

	_, err := c.doRequest(ctx, http.MethodPut, fmt.Sprintf("/repos/%s/%s/branches/%s/protection", c.cfg.GithubOrg, repo.Name, repo.DefaultBranch), nil, request)
	if err != nil {
		message := errorMessage(err)
		action.Success = false
		action.Message = &message
		return action
	}

	action.Success = true
	return action
}

func (c *Client) applyRepoSettings(ctx context.Context, repo Repository, options RepoSettingsOptions) GovernanceActionResult {
	action := GovernanceActionResult{
		Repo:   repo.FullName,
		Action: "repoSettings",
	}

	if c.cfg.GithubOrg == "" {
		message := "missing githubOrg configuration"
		action.Success = false
		action.Message = &message
		return action
	}

	payload := map[string]any{}
	if options.DeleteBranchOnMerge != nil {
		payload["delete_branch_on_merge"] = options.DeleteBranchOnMerge
	}
	if options.AllowUpdateBranch != nil {
		payload["allow_update_branch"] = options.AllowUpdateBranch
	}
	if options.AllowAutoMerge != nil {
		payload["allow_auto_merge"] = options.AllowAutoMerge
	}

	if len(payload) == 0 {
		action.Success = true
		return action
	}

	_, err := c.doRequest(ctx, http.MethodPatch, fmt.Sprintf("/repos/%s/%s", c.cfg.GithubOrg, repo.Name), nil, payload)
	if err != nil {
		message := errorMessage(err)
		action.Success = false
		action.Message = &message
		return action
	}

	action.Success = true
	action.RepoID = &repo.ID
	action.Changes = &options
	return action
}

func errorMessage(err error) string {
	switch e := err.(type) {
	case *RequestError:
		body := strings.TrimSpace(e.Body)
		if len(body) > 400 {
			body = body[:400] + "..."
		}
		return fmt.Sprintf("%d: %s", e.Status, body)
	default:
		return err.Error()
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func containsRepo(filter map[string]struct{}, repo Repository) bool {
	if len(filter) == 0 {
		return true
	}
	if _, ok := filter[strings.ToLower(repo.FullName)]; ok {
		return true
	}
	if _, ok := filter[strings.ToLower(repo.Name)]; ok {
		return true
	}
	return false
}

func normaliseRepoFilter(list []string) map[string]struct{} {
	filter := make(map[string]struct{}, len(list))
	for _, item := range list {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			filter[strings.ToLower(trimmed)] = struct{}{}
		}
	}
	return filter
}

type GovernanceResponse struct {
	Results []GovernanceActionResult `json:"results"`
	Stats   struct {
		TotalReposAffected int `json:"totalReposAffected"`
		Successes          int `json:"successes"`
		Failures           int `json:"failures"`
	} `json:"stats"`
	Snapshot *models.RepoSnapshot `json:"snapshot,omitempty"`
	Count    int                  `json:"count"`
}

func (c *Client) ApplyGovernanceActions(ctx context.Context, req GovernanceActionRequest, cache *CacheProvider) (*GovernanceResponse, error) {
	if req.TargetDefaultBranch == nil && req.BranchProtection == nil && req.RepoSettings == nil {
		return nil, fmt.Errorf("no governance actions specified")
	}

	repos, _, err := c.ListAllOrganizationRepos(ctx)
	if err != nil {
		return nil, err
	}

	filter := normaliseRepoFilter(req.Repos)
	results := make([]GovernanceActionResult, 0)
	successes := 0

	for _, repo := range repos {
		if !containsRepo(filter, repo) {
			continue
		}

		if req.TargetDefaultBranch != nil {
			result := c.renameDefaultBranch(ctx, repo, *req.TargetDefaultBranch)
			if result.Success {
				successes++
			}
			results = append(results, result)
		}

		if req.BranchProtection != nil {
			result := c.applyBranchProtection(ctx, repo, *req.BranchProtection)
			if result.Success {
				successes++
			}
			results = append(results, result)
		}

		if req.RepoSettings != nil {
			result := c.applyRepoSettings(ctx, repo, *req.RepoSettings)
			if result.Success {
				successes++
			}
			results = append(results, result)
		}
	}

	response := &GovernanceResponse{
		Results: results,
	}
	response.Stats.TotalReposAffected = len(results)
	response.Stats.Successes = successes
	response.Stats.Failures = len(results) - successes

	if cache != nil && c.cfg.GithubOrg != "" && successes > 0 {
		if err := cache.Refresh(ctx, c, results); err != nil {
			return nil, err
		}
		snapshot := cache.LatestSnapshot()
		if snapshot != nil {
			response.Snapshot = snapshot
			response.Count = snapshot.Totals.Repos
		}
	}

	return response, nil
}

// CacheProvider coordinates reading/writing repo snapshots during governance actions.
type CacheProvider struct {
	org      string
	manager  *cache.Manager
	snapshot *models.RepoSnapshot
}

func NewCacheProvider(manager *cache.Manager, org string) *CacheProvider {
	if manager == nil || org == "" {
		return &CacheProvider{}
	}
	return &CacheProvider{
		org:     org,
		manager: manager,
	}
}

func (c *CacheProvider) LatestSnapshot() *models.RepoSnapshot {
	return c.snapshot
}

func (c *CacheProvider) Refresh(ctx context.Context, client *Client, results []GovernanceActionResult) error {
	if c.manager == nil || c.org == "" {
		return nil
	}

	if c.snapshot == nil {
		entry, err := cache.ReadLatest[models.RepoSnapshot](c.manager, c.org)
		if err == nil && entry != nil {
			snap := entry.Payload
			c.snapshot = &snap
		}
	}

	if c.snapshot == nil {
		summary, err := rebuildSnapshot(ctx, client)
		if err != nil {
			return err
		}
		c.snapshot = summary
		_, err = cache.Write(c.manager, c.org, *summary)
		return err
	}

	snapshot := c.snapshot
	for _, result := range results {
		if !result.Success || result.Action != "repoSettings" || result.RepoID == nil || result.Changes == nil {
			continue
		}
		for i := range snapshot.Governance.RepoPolicies {
			policy := &snapshot.Governance.RepoPolicies[i]
			if policy.ID == *result.RepoID || strings.EqualFold(policy.FullName, result.Repo) {
				if result.Changes.DeleteBranchOnMerge != nil {
					policy.DeleteBranchOnMerge = result.Changes.DeleteBranchOnMerge
				}
				if result.Changes.AllowAutoMerge != nil {
					policy.AllowAutoMerge = result.Changes.AllowAutoMerge
				}
				if result.Changes.AllowUpdateBranch != nil {
					policy.AllowUpdateBranch = result.Changes.AllowUpdateBranch
				}
				break
			}
		}
	}

	_, err := cache.WriteAt(c.manager, c.org, *snapshot, time.Now().UTC())
	return err
}

func rebuildSnapshot(ctx context.Context, client *Client) (*models.RepoSnapshot, error) {
	repos, _, err := client.ListAllOrganizationRepos(ctx)
	if err != nil {
		return nil, err
	}

	summaries := make([]models.RepoSummary, 0, len(repos))
	for _, repo := range repos {
		summaries = append(summaries, MapToRepoSummary(repo))
	}

	snapshot, err := client.BuildOrganizationSnapshot(ctx, repos, summaries)
	if err != nil {
		return nil, err
	}
	return snapshot, nil
}

// UnmarshalJSON customises GovernanceActionRequest to handle optional structs.
func (r *GovernanceActionRequest) UnmarshalJSON(data []byte) error {
	type alias GovernanceActionRequest
	aux := alias{}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	*r = GovernanceActionRequest(aux)
	return nil
}

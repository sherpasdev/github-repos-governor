package github

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github-repos-governor/internal/models"
)

const (
	weeksToAnalyse      = 13
	maxContributorRepos = 15
	maxWorkflowRepos    = 40
)

func (c *Client) listAllOrgMembers(ctx context.Context) (int, error) {
	if c.cfg.GithubOrg == "" {
		return 0, nil
	}

	total := 0
	page := 1
	perPage := 100

	for {
		params := url.Values{}
		params.Set("per_page", fmt.Sprintf("%d", perPage))
		params.Set("page", fmt.Sprintf("%d", page))

		resp, err := c.doRequest(ctx, http.MethodGet, fmt.Sprintf("/orgs/%s/members", c.cfg.GithubOrg), params, nil)
		if err != nil {
			var requestErr *RequestError
			if errors.As(err, &requestErr) && requestErr.Status == http.StatusForbidden {
				return total, nil
			}
			return 0, err
		}

		var members []struct {
			Login string `json:"login"`
		}
		data, _, err := decodeResponse[[]struct {
			Login string `json:"login"`
		}](resp)
		if err != nil {
			return 0, err
		}
		members = data

		total += len(members)
		if len(members) < perPage {
			break
		}
		page++
	}

	return total, nil
}

func toWeekKey(unixSeconds int64) string {
	return time.Unix(unixSeconds, 0).UTC().Format("2006-01-02")
}

func (c *Client) fetchCommitActivity(ctx context.Context, repo Repository) ([]CommitActivityWeek, error) {
	if c.cfg.GithubOrg == "" {
		return nil, nil
	}

	for attempt := 0; attempt < 3; attempt++ {
		resp, err := c.doRequest(ctx, http.MethodGet, fmt.Sprintf("/repos/%s/%s/stats/commit_activity", c.cfg.GithubOrg, repo.Name), nil, nil)
		if err != nil {
			return nil, err
		}
		data, _, err := decodeResponse[[]CommitActivityWeek](resp)
		if err != nil {
			return nil, err
		}
		if len(data) > 0 {
			return data, nil
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(time.Second):
		}
	}
	return nil, nil
}

func (c *Client) fetchContributorStats(ctx context.Context, repo Repository) ([]ContributorStats, error) {
	if c.cfg.GithubOrg == "" {
		return nil, nil
	}

	for attempt := 0; attempt < 3; attempt++ {
		resp, err := c.doRequest(ctx, http.MethodGet, fmt.Sprintf("/repos/%s/%s/stats/contributors", c.cfg.GithubOrg, repo.Name), nil, nil)
		if err != nil {
			return nil, err
		}
		data, _, err := decodeResponse[[]ContributorStats](resp)
		if err != nil {
			return nil, err
		}
		if len(data) > 0 {
			return data, nil
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(time.Second):
		}
	}
	return nil, nil
}

func emptyBranchProtection(enabled bool) models.BranchProtectionSnapshot {
	return models.BranchProtectionSnapshot{
		Enabled:                      enabled,
		RequiredApprovingReviewCount: nil,
		DismissStaleReviews:          false,
		RequireCodeOwnerReviews:      false,
		RequiredStatusChecks:         nil,
		AllowsForcePushes:            nil,
	}
}

func (c *Client) fetchBranchProtectionInfo(ctx context.Context, repo Repository) (BranchProtectionInfo, error) {
	if c.cfg.GithubOrg == "" {
		return BranchProtectionInfo{State: "unknown", Details: emptyBranchProtection(false)}, nil
	}

	resp, err := c.doRequest(ctx, http.MethodGet, fmt.Sprintf("/repos/%s/%s/branches/%s/protection", c.cfg.GithubOrg, repo.Name, repo.DefaultBranch), nil, nil)
	if err != nil {
		var requestErr *RequestError
		if errors.As(err, &requestErr) {
			switch requestErr.Status {
			case http.StatusNotFound:
				return BranchProtectionInfo{State: "unprotected", Details: emptyBranchProtection(false)}, nil
			case http.StatusForbidden:
				return BranchProtectionInfo{State: "unknown", Details: emptyBranchProtection(false)}, nil
			}
		}
		return BranchProtectionInfo{State: "unknown", Details: emptyBranchProtection(false)}, nil
	}

	var data struct {
		RequiredPullRequestReviews *struct {
			DismissStaleReviews          bool `json:"dismiss_stale_reviews"`
			RequireCodeOwnerReviews      bool `json:"require_code_owner_reviews"`
			RequiredApprovingReviewCount *int `json:"required_approving_review_count"`
			RequireLastPushApproval      bool `json:"require_last_push_approval"`
		} `json:"required_pull_request_reviews"`
		RequiredStatusChecks *struct {
			Strict   bool     `json:"strict"`
			Contexts []string `json:"contexts"`
		} `json:"required_status_checks"`
		AllowForcePushes *struct {
			Enabled *bool `json:"enabled"`
		} `json:"allow_force_pushes"`
	}

	decoded, _, err := decodeResponse[struct {
		RequiredPullRequestReviews *struct {
			DismissStaleReviews          bool `json:"dismiss_stale_reviews"`
			RequireCodeOwnerReviews      bool `json:"require_code_owner_reviews"`
			RequiredApprovingReviewCount *int `json:"required_approving_review_count"`
			RequireLastPushApproval      bool `json:"require_last_push_approval"`
		} `json:"required_pull_request_reviews"`
		RequiredStatusChecks *struct {
			Strict   bool     `json:"strict"`
			Contexts []string `json:"contexts"`
		} `json:"required_status_checks"`
		AllowForcePushes *struct {
			Enabled *bool `json:"enabled"`
		} `json:"allow_force_pushes"`
	}](resp)
	if err != nil {
		return BranchProtectionInfo{State: "unknown", Details: emptyBranchProtection(false)}, nil
	}
	data = decoded

	var statusChecks *models.StatusChecks
	if data.RequiredStatusChecks != nil {
		statusChecks = &models.StatusChecks{
			Strict:   data.RequiredStatusChecks.Strict,
			Contexts: append([]string{}, data.RequiredStatusChecks.Contexts...),
		}
	}

	var allowsForcePushes *bool
	if data.AllowForcePushes != nil {
		allowsForcePushes = data.AllowForcePushes.Enabled
	}

	details := models.BranchProtectionSnapshot{
		Enabled:                      true,
		RequiredApprovingReviewCount: nil,
		DismissStaleReviews:          false,
		RequireCodeOwnerReviews:      false,
		RequiredStatusChecks:         statusChecks,
		AllowsForcePushes:            allowsForcePushes,
	}

	if data.RequiredPullRequestReviews != nil {
		details.DismissStaleReviews = data.RequiredPullRequestReviews.DismissStaleReviews
		details.RequireCodeOwnerReviews = data.RequiredPullRequestReviews.RequireCodeOwnerReviews
		details.RequiredApprovingReviewCount = data.RequiredPullRequestReviews.RequiredApprovingReviewCount
	}

	return BranchProtectionInfo{State: "protected", Details: details}, nil
}

func (c *Client) fetchWorkflowState(ctx context.Context, repo Repository) (*bool, error) {
	if c.cfg.GithubOrg == "" {
		return nil, nil
	}

	resp, err := c.doRequest(ctx, http.MethodGet, fmt.Sprintf("/repos/%s/%s/actions/workflows", c.cfg.GithubOrg, repo.Name), nil, nil)
	if err != nil {
		var requestErr *RequestError
		if errors.As(err, &requestErr) && requestErr.Status == http.StatusForbidden {
			return nil, nil
		}
		return nil, err
	}

	workflows, _, err := decodeResponse[WorkflowList](resp)
	if err != nil {
		return nil, err
	}

	for _, workflow := range workflows.Workflows {
		if workflow.Path == "" {
			continue
		}
		contentResp, err := c.doRequest(ctx, http.MethodGet, fmt.Sprintf("/repos/%s/%s/contents/%s", c.cfg.GithubOrg, repo.Name, workflow.Path), nil, nil)
		if err != nil {
			continue
		}
		content, _, err := decodeResponse[WorkflowContent](contentResp)
		if err != nil {
			continue
		}
		if !strings.EqualFold(content.Encoding, "base64") {
			continue
		}
		decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(content.Content))
		if err != nil {
			continue
		}
		if strings.Contains(string(decoded), "pull_request") {
			value := true
			return &value, nil
		}
	}

	value := false
	return &value, nil
}

func (c *Client) fetchRepositoryDetails(ctx context.Context, repo Repository) (Repository, error) {
	if c.cfg.GithubOrg == "" {
		return repo, nil
	}

	detail, _, err := c.GetRepository(ctx, repo.Name)
	if err != nil {
		return repo, nil
	}
	return detail, nil
}

func computeSecuritySnapshot(repos []Repository, protection map[int64]BranchProtectionInfo, workflows map[int64]*bool) models.SecuritySnapshot {
	total := len(repos)
	dependabot := 0
	codeql := 0
	branchProtected := 0
	branchEvaluated := 0
	prWorkflow := 0
	prEvaluated := 0
	problematic := make([]models.ProblematicRepo, 0)

	for _, repo := range repos {
		reasons := make([]string, 0)
		if security := repo.SecurityAndAnalysis; security != nil {
			if status := security.DependabotSecurityUpdates; status != nil && status.Status == "enabled" {
				dependabot++
			} else {
				reasons = append(reasons, "Dependabot disabled")
			}
			if status := security.AdvancedSecurity; status != nil && status.Status == "enabled" {
				codeql++
			} else {
				reasons = append(reasons, "CodeQL not enabled")
			}
		} else {
			reasons = append(reasons, "Security features unavailable")
		}

		if info, ok := protection[repo.ID]; ok {
			switch info.State {
			case "protected":
				branchProtected++
				branchEvaluated++
				if info.Details.AllowsForcePushes != nil && *info.Details.AllowsForcePushes {
					reasons = append(reasons, "Force pushes allowed on protected branch")
				}
				if info.Details.RequiredStatusChecks != nil && len(info.Details.RequiredStatusChecks.Contexts) == 0 {
					reasons = append(reasons, "No status checks configured")
				}
				if !info.Details.DismissStaleReviews {
					reasons = append(reasons, "Stale reviews not dismissed")
				}
				if !info.Details.RequireCodeOwnerReviews {
					reasons = append(reasons, "Code owner reviews not required")
				}
			case "unprotected":
				branchEvaluated++
				reasons = append(reasons, "Default branch unprotected")
			default:
				reasons = append(reasons, "Branch protection unknown")
			}
		} else {
			reasons = append(reasons, "Branch protection unknown")
		}

		if workflowState, ok := workflows[repo.ID]; ok {
			if workflowState == nil {
				reasons = append(reasons, "Workflow status unknown")
			} else if *workflowState {
				prWorkflow++
				prEvaluated++
			} else {
				prEvaluated++
				reasons = append(reasons, "No PR workflow detected")
			}
		}

		if len(reasons) > 0 {
			problematic = append(problematic, models.ProblematicRepo{
				Repo:    repo.FullName,
				HTMLURL: repo.HTMLURL,
				Reasons: reasons,
			})
		}
	}

	sort.Slice(problematic, func(i, j int) bool {
		return len(problematic[i].Reasons) > len(problematic[j].Reasons)
	})
	if len(problematic) > 5 {
		problematic = problematic[:5]
	}

	return models.SecuritySnapshot{
		DependabotEnabledPct: percentage(dependabot, total),
		CodeQLEnabledPct:     percentage(codeql, total),
		BranchProtectionPct:  percentage(branchProtected, branchEvaluated),
		PRWorkflowPct:        percentage(prWorkflow, prEvaluated),
		ProblematicRepos:     problematic,
	}
}

func percentage(value, total int) *float64 {
	if total == 0 {
		return nil
	}
	pct := (float64(value) / float64(total)) * 100
	rounded := math.Round(pct*10) / 10
	return &rounded
}

func (c *Client) buildContributionsTimeline(ctx context.Context, repos []Repository) (models.ContributionsTimeline, models.ContributorsSnapshot, error) {
	weekTotals := make(map[string]int)
	byRepo := make(map[string]map[string]int)
	contributorTotals := make(map[string]int)

	analyzedRepos := 0

	sorted := append([]Repository(nil), repos...)
	sort.Slice(sorted, func(i, j int) bool {
		iTime, _ := time.Parse(time.RFC3339, sorted[i].PushedAt)
		jTime, _ := time.Parse(time.RFC3339, sorted[j].PushedAt)
		return iTime.After(jTime)
	})
	if len(sorted) > maxContributorRepos {
		sorted = sorted[:maxContributorRepos]
	}

	for _, repo := range sorted {
		select {
		case <-ctx.Done():
			return models.ContributionsTimeline{}, models.ContributorsSnapshot{}, ctx.Err()
		default:
		}

		commitActivity, err := c.fetchCommitActivity(ctx, repo)
		if err != nil || len(commitActivity) == 0 {
			continue
		}

		repoWeekMap := make(map[string]int)
		recent := commitActivity
		if len(recent) > weeksToAnalyse {
			recent = recent[len(recent)-weeksToAnalyse:]
		}

		for _, week := range recent {
			key := toWeekKey(week.Week)
			repoWeekMap[key] = repoWeekMap[key] + week.Total
			weekTotals[key] = weekTotals[key] + week.Total
		}

		byRepo[repo.FullName] = repoWeekMap

		stats, err := c.fetchContributorStats(ctx, repo)
		if err == nil {
			for _, contributor := range stats {
				login := "unknown"
				if contributor.Author.Login != nil && *contributor.Author.Login != "" {
					login = *contributor.Author.Login
				}
				weeks := contributor.Weeks
				if len(weeks) > weeksToAnalyse {
					weeks = weeks[len(weeks)-weeksToAnalyse:]
				}
				total := 0
				for _, week := range weeks {
					total += week.Commits
				}
				if total > 0 {
					contributorTotals[login] += total
				}
			}
		}

		analyzedRepos++
	}

	weekSeries := make([]models.AggregateWeek, 0, len(weekTotals))
	for week, total := range weekTotals {
		weekSeries = append(weekSeries, models.AggregateWeek{
			WeekStart:    week,
			TotalCommits: total,
		})
	}
	sort.Slice(weekSeries, func(i, j int) bool {
		return weekSeries[i].WeekStart < weekSeries[j].WeekStart
	})

	repoSeries := make([]models.RepoTimeline, 0, len(byRepo))
	for repoName, data := range byRepo {
		points := make([]models.WeeklyCommits, len(weekSeries))
		for i, week := range weekSeries {
			points[i] = models.WeeklyCommits{
				WeekStart: week.WeekStart,
				Commits:   data[week.WeekStart],
			}
		}
		repoSeries = append(repoSeries, models.RepoTimeline{
			Repo: repoName,
			Data: points,
		})
	}

	topContributors := make([]models.ContributorCommits, 0, len(contributorTotals))
	for login, commits := range contributorTotals {
		topContributors = append(topContributors, models.ContributorCommits{
			Login:        login,
			TotalCommits: commits,
		})
	}
	sort.Slice(topContributors, func(i, j int) bool {
		return topContributors[i].TotalCommits > topContributors[j].TotalCommits
	})
	if len(topContributors) > 10 {
		topContributors = topContributors[:10]
	}

	contributorSnapshot := models.ContributorsSnapshot{
		Total:           0,
		TopContributors: make([]models.Contributor, len(topContributors)),
	}
	for i, contributor := range topContributors {
		contributorSnapshot.TopContributors[i] = models.Contributor{
			Login:   contributor.Login,
			Commits: contributor.TotalCommits,
		}
	}

	memberCount, err := c.listAllOrgMembers(ctx)
	if err == nil {
		contributorSnapshot.Total = memberCount
	}

	contributions := models.ContributionsTimeline{
		Weeks:         weekSeries,
		ByRepo:        repoSeries,
		ByContributor: topContributors,
		AnalyzedRepos: analyzedRepos,
	}

	return contributions, contributorSnapshot, nil
}

func (c *Client) BuildOrganizationSnapshot(ctx context.Context, repos []Repository, summaries []models.RepoSummary) (*models.RepoSnapshot, error) {
	base := models.BuildRepoBaseSnapshot(summaries)
	snapshot := models.BuildEmptySnapshot()
	snapshot.Version = models.SnapshotVersion
	snapshot.Totals = base.Totals
	snapshot.Languages = base.Languages
	snapshot.DefaultBranches = base.DefaultBranches

	protectionMap := make(map[int64]BranchProtectionInfo)
	workflowStates := make(map[int64]*bool)
	repoPolicies := make([]models.RepoPolicySnapshot, 0, len(repos))

	for _, repo := range repos {
		detail, err := c.fetchRepositoryDetails(ctx, repo)
		if err != nil {
			detail = repo
		}

		protectionMap[repo.ID] = BranchProtectionInfo{State: "unknown", Details: emptyBranchProtection(false)}
		repoPolicies = append(repoPolicies, models.RepoPolicySnapshot{
			ID:                      repo.ID,
			Name:                    repo.Name,
			FullName:                repo.FullName,
			HTMLURL:                 repo.HTMLURL,
			DefaultBranch:           repo.DefaultBranch,
			DefaultBranchPushedAt:   selectString(detail.PushedAt, repo.PushedAt),
			AdvancedSecurityEnabled: selectBoolFromSecurity(detail.SecurityAndAnalysis, repo.SecurityAndAnalysis),
			AdvancedSecurityStatus:  selectSecurityStatus(detail.SecurityAndAnalysis, repo.SecurityAndAnalysis, advancedSecurityExtractor{}),
			DependencyGraphEnabled:  selectDependencyGraph(detail.SecurityAndAnalysis, repo.SecurityAndAnalysis),
			DependencyGraphStatus:   selectSecurityStatus(detail.SecurityAndAnalysis, repo.SecurityAndAnalysis, dependencyGraphExtractor{}),
			BranchProtection:        emptyBranchProtection(false),
			DeleteBranchOnMerge:     selectBool(detail.DeleteBranchOnMerge, repo.DeleteBranchOnMerge),
			AllowAutoMerge:          selectBool(detail.AllowAutoMerge, repo.AllowAutoMerge),
			AllowUpdateBranch:       selectBool(detail.AllowUpdateBranch, repo.AllowUpdateBranch),
		})
	}

	for _, repo := range repos {
		info, err := c.fetchBranchProtectionInfo(ctx, repo)
		if err != nil {
			continue
		}
		protectionMap[repo.ID] = info
		for i := range repoPolicies {
			if repoPolicies[i].ID == repo.ID {
				repoPolicies[i].BranchProtection = info.Details
				break
			}
		}
	}

	reposForWorkflow := repos
	if len(reposForWorkflow) > maxWorkflowRepos {
		reposForWorkflow = reposForWorkflow[:maxWorkflowRepos]
	}

	for _, repo := range reposForWorkflow {
		state, err := c.fetchWorkflowState(ctx, repo)
		if err != nil {
			continue
		}
		workflowStates[repo.ID] = state
	}

	contributions, contributors, err := c.buildContributionsTimeline(ctx, repos)
	if err != nil {
		return nil, err
	}

	snapshot.Contributors = contributors
	snapshot.Contributions = contributions
	snapshot.Security = computeSecuritySnapshot(repos, protectionMap, workflowStates)
	snapshot.Governance = models.GovernanceSnapshot{
		RepoPolicies: repoPolicies,
	}

	return &snapshot, nil
}

func selectBool(primary, fallback *bool) *bool {
	if primary != nil {
		return primary
	}
	return fallback
}

func selectString(primary, fallback string) *string {
	value := strings.TrimSpace(primary)
	if value == "" {
		value = strings.TrimSpace(fallback)
	}
	if value == "" {
		return nil
	}
	return &value
}

func selectBoolFromSecurity(primary, fallback *struct {
	DependabotSecurityUpdates *struct {
		Status string `json:"status"`
	} `json:"dependabot_security_updates"`
	AdvancedSecurity *struct {
		Status string `json:"status"`
	} `json:"advanced_security"`
	DependencyGraph *struct {
		Status string `json:"status"`
	} `json:"dependency_graph"`
	SecretScanning *struct {
		Status string `json:"status"`
	} `json:"secret_scanning"`
	SecretScanningPushProtection *struct {
		Status string `json:"status"`
	} `json:"secret_scanning_push_protection"`
}) *bool {
	value := extractAdvancedSecurity(primary)
	if value != nil {
		return value
	}
	return extractAdvancedSecurity(fallback)
}

func extractAdvancedSecurity(payload *struct {
	DependabotSecurityUpdates *struct {
		Status string `json:"status"`
	} `json:"dependabot_security_updates"`
	AdvancedSecurity *struct {
		Status string `json:"status"`
	} `json:"advanced_security"`
	DependencyGraph *struct {
		Status string `json:"status"`
	} `json:"dependency_graph"`
	SecretScanning *struct {
		Status string `json:"status"`
	} `json:"secret_scanning"`
	SecretScanningPushProtection *struct {
		Status string `json:"status"`
	} `json:"secret_scanning_push_protection"`
}) *bool {
	if payload == nil || payload.AdvancedSecurity == nil {
		return nil
	}
	switch normalizeStatus(payload.AdvancedSecurity.Status) {
	case "enabled":
		value := true
		return &value
	case "disabled":
		value := false
		return &value
	default:
		return nil
	}
}

func selectDependencyGraph(primary, fallback *struct {
	DependabotSecurityUpdates *struct {
		Status string `json:"status"`
	} `json:"dependabot_security_updates"`
	AdvancedSecurity *struct {
		Status string `json:"status"`
	} `json:"advanced_security"`
	DependencyGraph *struct {
		Status string `json:"status"`
	} `json:"dependency_graph"`
	SecretScanning *struct {
		Status string `json:"status"`
	} `json:"secret_scanning"`
	SecretScanningPushProtection *struct {
		Status string `json:"status"`
	} `json:"secret_scanning_push_protection"`
}) *bool {
	value := extractDependencyGraph(primary)
	if value != nil {
		return value
	}
	return extractDependencyGraph(fallback)
}

func extractDependencyGraph(payload *struct {
	DependabotSecurityUpdates *struct {
		Status string `json:"status"`
	} `json:"dependabot_security_updates"`
	AdvancedSecurity *struct {
		Status string `json:"status"`
	} `json:"advanced_security"`
	DependencyGraph *struct {
		Status string `json:"status"`
	} `json:"dependency_graph"`
	SecretScanning *struct {
		Status string `json:"status"`
	} `json:"secret_scanning"`
	SecretScanningPushProtection *struct {
		Status string `json:"status"`
	} `json:"secret_scanning_push_protection"`
}) *bool {
	if payload == nil || payload.DependencyGraph == nil {
		return nil
	}
	switch normalizeStatus(payload.DependencyGraph.Status) {
	case "enabled":
		value := true
		return &value
	case "disabled":
		value := false
		return &value
	default:
		return nil
	}
}

type securityExtractor interface {
	Extract(payload *struct {
		DependabotSecurityUpdates *struct {
			Status string `json:"status"`
		} `json:"dependabot_security_updates"`
		AdvancedSecurity *struct {
			Status string `json:"status"`
		} `json:"advanced_security"`
		DependencyGraph *struct {
			Status string `json:"status"`
		} `json:"dependency_graph"`
		SecretScanning *struct {
			Status string `json:"status"`
		} `json:"secret_scanning"`
		SecretScanningPushProtection *struct {
			Status string `json:"status"`
		} `json:"secret_scanning_push_protection"`
	}) string
}

type advancedSecurityExtractor struct{}

func (advancedSecurityExtractor) Extract(payload *struct {
	DependabotSecurityUpdates *struct {
		Status string `json:"status"`
	} `json:"dependabot_security_updates"`
	AdvancedSecurity *struct {
		Status string `json:"status"`
	} `json:"advanced_security"`
	DependencyGraph *struct {
		Status string `json:"status"`
	} `json:"dependency_graph"`
	SecretScanning *struct {
		Status string `json:"status"`
	} `json:"secret_scanning"`
	SecretScanningPushProtection *struct {
		Status string `json:"status"`
	} `json:"secret_scanning_push_protection"`
}) string {
	if payload == nil || payload.AdvancedSecurity == nil {
		return ""
	}
	return payload.AdvancedSecurity.Status
}

type dependencyGraphExtractor struct{}

func (dependencyGraphExtractor) Extract(payload *struct {
	DependabotSecurityUpdates *struct {
		Status string `json:"status"`
	} `json:"dependabot_security_updates"`
	AdvancedSecurity *struct {
		Status string `json:"status"`
	} `json:"advanced_security"`
	DependencyGraph *struct {
		Status string `json:"status"`
	} `json:"dependency_graph"`
	SecretScanning *struct {
		Status string `json:"status"`
	} `json:"secret_scanning"`
	SecretScanningPushProtection *struct {
		Status string `json:"status"`
	} `json:"secret_scanning_push_protection"`
}) string {
	if payload == nil || payload.DependencyGraph == nil {
		return ""
	}
	return payload.DependencyGraph.Status
}

func selectSecurityStatus(primary, fallback *struct {
	DependabotSecurityUpdates *struct {
		Status string `json:"status"`
	} `json:"dependabot_security_updates"`
	AdvancedSecurity *struct {
		Status string `json:"status"`
	} `json:"advanced_security"`
	DependencyGraph *struct {
		Status string `json:"status"`
	} `json:"dependency_graph"`
	SecretScanning *struct {
		Status string `json:"status"`
	} `json:"secret_scanning"`
	SecretScanningPushProtection *struct {
		Status string `json:"status"`
	} `json:"secret_scanning_push_protection"`
}, extractor securityExtractor) *string {
	if status := strings.TrimSpace(extractor.Extract(primary)); status != "" {
		return &status
	}
	if status := strings.TrimSpace(extractor.Extract(fallback)); status != "" {
		return &status
	}
	return nil
}

func normalizeStatus(status string) string {
	trimmed := strings.TrimSpace(status)
	if trimmed == "" {
		return ""
	}
	lower := strings.ToLower(trimmed)
	switch {
	case strings.HasPrefix(lower, "enabled"):
		return "enabled"
	case strings.HasPrefix(lower, "disabled"):
		return "disabled"
	case strings.HasPrefix(lower, "not_available"):
		return "not_available"
	case strings.HasPrefix(lower, "not_supported") || strings.HasPrefix(lower, "unsupported"):
		return "not_supported"
	case strings.HasPrefix(lower, "required"):
		return "required"
	default:
		return ""
	}
}

func describeStatus(status string) string {
	trimmed := strings.TrimSpace(status)
	if trimmed == "" {
		return ""
	}
	lower := strings.ToLower(trimmed)
	var base string
	var detail string
	switch {
	case strings.HasPrefix(lower, "enabled"):
		base = "enabled"
		detail = strings.TrimPrefix(lower, "enabled")
	case strings.HasPrefix(lower, "disabled"):
		base = "disabled"
		detail = strings.TrimPrefix(lower, "disabled")
	case strings.HasPrefix(lower, "not_available"):
		return "not_available"
	case strings.HasPrefix(lower, "not_supported") || strings.HasPrefix(lower, "unsupported"):
		return "not_supported"
	case strings.HasPrefix(lower, "required"):
		return "required"
	default:
		return trimmed
	}
	detail = strings.Trim(detail, " _")
	if detail == "" {
		return base
	}
	return base + " (" + detail + ")"
}

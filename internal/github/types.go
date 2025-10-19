package github

import (
	"time"

	"github-repos-governor/internal/models"
)

type Repository struct {
	ID            int64    `json:"id"`
	Name          string   `json:"name"`
	FullName      string   `json:"full_name"`
	HTMLURL       string   `json:"html_url"`
	Description   *string  `json:"description"`
	Language      *string  `json:"language"`
	Homepage      *string  `json:"homepage"`
	Stargazers    int      `json:"stargazers_count"`
	Watchers      int      `json:"watchers_count"`
	Forks         int      `json:"forks_count"`
	OpenIssues    int      `json:"open_issues_count"`
	DefaultBranch string   `json:"default_branch"`
	Visibility    string   `json:"visibility"`
	Private       bool     `json:"private"`
	Archived      bool     `json:"archived"`
	Disabled      bool     `json:"disabled"`
	PushedAt      string   `json:"pushed_at"`
	UpdatedAt     string   `json:"updated_at"`
	CreatedAt     string   `json:"created_at"`
	Size          int      `json:"size"`
	Topics        []string `json:"topics"`
	License       *struct {
		Key    string  `json:"key"`
		Name   string  `json:"name"`
		SPDXID *string `json:"spdx_id"`
		URL    *string `json:"url"`
	} `json:"license"`
	SecurityAndAnalysis *struct {
		DependabotSecurityUpdates *struct {
			Status string `json:"status"`
		} `json:"dependabot_security_updates"`
		AdvancedSecurity *struct {
			Status string `json:"status"`
		} `json:"advanced_security"`
		SecretScanning *struct {
			Status string `json:"status"`
		} `json:"secret_scanning"`
		SecretScanningPushProtection *struct {
			Status string `json:"status"`
		} `json:"secret_scanning_push_protection"`
	} `json:"security_and_analysis"`
	AllowAutoMerge      *bool `json:"allow_auto_merge"`
	AllowUpdateBranch   *bool `json:"allow_update_branch"`
	DeleteBranchOnMerge *bool `json:"delete_branch_on_merge"`
}

type RateLimitInfo = models.RateLimitInfo

type RepoListOptions struct {
	Page      int
	PerPage   int
	Sort      string
	Direction string
	Type      string
}

type RepoListResult struct {
	Repositories []Repository
	RateLimit    RateLimitInfo
	HasNextPage  bool
	HasPrevPage  bool
}

type GovernanceActionRequest struct {
	TargetDefaultBranch *string                  `json:"targetDefaultBranch"`
	BranchProtection    *BranchProtectionOptions `json:"branchProtection"`
	RepoSettings        *RepoSettingsOptions     `json:"repoSettings"`
	Repos               []string                 `json:"repos"`
}

type BranchProtectionOptions struct {
	ApprovalsRequired   int      `json:"approvalsRequired"`
	DismissStaleReviews bool     `json:"dismissStaleReviews"`
	RequireCodeOwners   bool     `json:"requireCodeOwners"`
	StrictStatusChecks  bool     `json:"strictStatusChecks"`
	StatusCheckContexts []string `json:"statusCheckContexts"`
	RestrictForcePushes bool     `json:"restrictForcePushes"`
	RequireUpToDate     *bool    `json:"requireUpToDate"`
}

type RepoSettingsOptions struct {
	DeleteBranchOnMerge *bool `json:"deleteBranchOnMerge"`
	AllowUpdateBranch   *bool `json:"allowUpdateBranch"`
	AllowAutoMerge      *bool `json:"allowAutoMerge"`
}

type GovernanceActionResult struct {
	Repo    string               `json:"repo"`
	Action  string               `json:"action"`
	Success bool                 `json:"success"`
	Message *string              `json:"message,omitempty"`
	RepoID  *int64               `json:"repoId,omitempty"`
	Changes *RepoSettingsOptions `json:"changes,omitempty"`
}

type BranchProtectionInfo struct {
	State   string                          `json:"state"`
	Details models.BranchProtectionSnapshot `json:"details"`
}

type Workflow struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Path  string `json:"path"`
	State string `json:"state"`
}

type WorkflowList struct {
	Workflows []Workflow `json:"workflows"`
}

type WorkflowContent struct {
	Content  string `json:"content"`
	Encoding string `json:"encoding"`
}

type ContributorStats struct {
	Author struct {
		Login *string `json:"login"`
	} `json:"author"`
	Weeks []struct {
		Week    int64 `json:"w"`
		Commits int   `json:"c"`
	} `json:"weeks"`
}

type CommitActivityWeek struct {
	Week  int64 `json:"week"`
	Total int   `json:"total"`
}

func (r Repository) PushedAtTime() (time.Time, error) {
	return time.Parse(time.RFC3339, r.PushedAt)
}

func (r Repository) UpdatedAtTime() (time.Time, error) {
	return time.Parse(time.RFC3339, r.UpdatedAt)
}

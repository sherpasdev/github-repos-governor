package models

import (
	"math"
	"sort"
	"time"
)

type RateLimitInfo struct {
	Remaining *int `json:"remaining"`
	Limit     *int `json:"limit"`
	Reset     *int `json:"reset"`
}

type RepoSummary struct {
	ID                  int64    `json:"id"`
	Name                string   `json:"name"`
	Description         *string  `json:"description"`
	Language            *string  `json:"language"`
	Visibility          string   `json:"visibility"`
	LastPushedAt        string   `json:"lastPushedAt"`
	LastUpdatedAt       string   `json:"lastUpdatedAt"`
	Stars               int      `json:"stars"`
	Forks               int      `json:"forks"`
	Issues              int      `json:"issues"`
	DefaultBranch       string   `json:"defaultBranch"`
	HTMLURL             string   `json:"htmlUrl"`
	Size                int      `json:"size"`
	Archived            bool     `json:"archived"`
	Topics              []string `json:"topics"`
	DeleteBranchOnMerge *bool    `json:"deleteBranchOnMerge"`
	AllowAutoMerge      *bool    `json:"allowAutoMerge"`
	AllowUpdateBranch   *bool    `json:"allowUpdateBranch"`
}

type RepoDetail struct {
	ID            int64    `json:"id"`
	Name          string   `json:"name"`
	FullName      string   `json:"fullName"`
	Description   *string  `json:"description"`
	Language      *string  `json:"language"`
	Homepage      *string  `json:"homepage"`
	Visibility    string   `json:"visibility"`
	Watchers      int      `json:"watchers"`
	Private       bool     `json:"private"`
	Disabled      bool     `json:"disabled"`
	CreatedAt     string   `json:"createdAt"`
	UpdatedAt     string   `json:"updatedAt"`
	PushedAt      string   `json:"pushedAt"`
	Stars         int      `json:"stars"`
	Forks         int      `json:"forks"`
	Issues        int      `json:"issues"`
	DefaultBranch string   `json:"defaultBranch"`
	HTMLURL       string   `json:"htmlUrl"`
	Size          int      `json:"size"`
	Archived      bool     `json:"archived"`
	Topics        []string `json:"topics"`
	License       *string  `json:"license"`
}

type LanguageSlice struct {
	Name    string  `json:"name"`
	Count   int     `json:"count"`
	Percent float64 `json:"percent"`
}

type DefaultBranchSlice struct {
	Name    string  `json:"name"`
	Count   int     `json:"count"`
	Percent float64 `json:"percent"`
}

type TotalsSnapshot struct {
	Repos         int     `json:"repos"`
	PrivateCount  int     `json:"privateCount"`
	ArchivedCount int     `json:"archivedCount"`
	StaleCount30d int     `json:"staleCount30d"`
	LatestPush    *string `json:"latestPush"`
	LatestUpdate  *string `json:"latestUpdate"`
}

type StatusChecks struct {
	Strict   bool     `json:"strict"`
	Contexts []string `json:"contexts"`
}

type BranchProtectionSnapshot struct {
	Enabled                      bool          `json:"enabled"`
	RequiredApprovingReviewCount *int          `json:"requiredApprovingReviewCount"`
	DismissStaleReviews          bool          `json:"dismissStaleReviews"`
	RequireCodeOwnerReviews      bool          `json:"requireCodeOwnerReviews"`
	RequiredStatusChecks         *StatusChecks `json:"requiredStatusChecks"`
	AllowsForcePushes            *bool         `json:"allowsForcePushes"`
}

type RepoPolicySnapshot struct {
	ID                      int64                    `json:"id"`
	Name                    string                   `json:"name"`
	FullName                string                   `json:"fullName"`
	HTMLURL                 string                   `json:"htmlUrl"`
	DefaultBranch           string                   `json:"defaultBranch"`
	DefaultBranchPushedAt   *string                  `json:"defaultBranchPushedAt"`
	AdvancedSecurityEnabled *bool                    `json:"advancedSecurityEnabled"`
	AdvancedSecurityStatus  *string                  `json:"advancedSecurityStatus"`
	DependencyGraphEnabled  *bool                    `json:"dependencyGraphEnabled"`
	DependencyGraphStatus   *string                  `json:"dependencyGraphStatus"`
	BranchProtection        BranchProtectionSnapshot `json:"branchProtection"`
	DeleteBranchOnMerge     *bool                    `json:"deleteBranchOnMerge"`
	AllowAutoMerge          *bool                    `json:"allowAutoMerge"`
	AllowUpdateBranch       *bool                    `json:"allowUpdateBranch"`
}

type GovernanceSnapshot struct {
	RepoPolicies []RepoPolicySnapshot `json:"repoPolicies"`
}

type Contributor struct {
	Login   string `json:"login"`
	Commits int    `json:"commits"`
}

type ContributorsSnapshot struct {
	Total           int           `json:"total"`
	TopContributors []Contributor `json:"topContributors"`
}

type WeeklyCommits struct {
	WeekStart string `json:"weekStart"`
	Commits   int    `json:"commits"`
}

type AggregateWeek struct {
	WeekStart    string `json:"weekStart"`
	TotalCommits int    `json:"totalCommits"`
}

type RepoTimeline struct {
	Repo string          `json:"repo"`
	Data []WeeklyCommits `json:"data"`
}

type ContributorCommits struct {
	Login        string `json:"login"`
	TotalCommits int    `json:"totalCommits"`
}

type ContributionsTimeline struct {
	Weeks         []AggregateWeek      `json:"weeks"`
	ByRepo        []RepoTimeline       `json:"byRepo"`
	ByContributor []ContributorCommits `json:"byContributor"`
	AnalyzedRepos int                  `json:"analyzedRepos"`
}

type ProblematicRepo struct {
	Repo    string   `json:"repo"`
	HTMLURL string   `json:"htmlUrl"`
	Reasons []string `json:"reasons"`
}

type SecuritySnapshot struct {
	DependabotEnabledPct *float64          `json:"dependabotEnabledPct"`
	CodeQLEnabledPct     *float64          `json:"codeqlEnabledPct"`
	BranchProtectionPct  *float64          `json:"branchProtectionPct"`
	PRWorkflowPct        *float64          `json:"prWorkflowPct"`
	ProblematicRepos     []ProblematicRepo `json:"problematicRepos"`
}

type RepoSnapshot struct {
	Version         int                   `json:"version"`
	Totals          TotalsSnapshot        `json:"totals"`
	Languages       []LanguageSlice       `json:"languages"`
	DefaultBranches []DefaultBranchSlice  `json:"defaultBranches"`
	Contributors    ContributorsSnapshot  `json:"contributors"`
	Contributions   ContributionsTimeline `json:"contributions"`
	Security        SecuritySnapshot      `json:"security"`
	Governance      GovernanceSnapshot    `json:"governance"`
}

type BaseRepoSnapshot struct {
	Totals          TotalsSnapshot       `json:"totals"`
	Languages       []LanguageSlice      `json:"languages"`
	DefaultBranches []DefaultBranchSlice `json:"defaultBranches"`
}

const SnapshotVersion = 2

// BuildRepoBaseSnapshot aggregates quick metrics from repo summaries.
func BuildRepoBaseSnapshot(items []RepoSummary) BaseRepoSnapshot {
	total := len(items)

	now := time.Now()
	languageCounts := make(map[string]int)
	branchCounts := make(map[string]int)
	var latestPush *time.Time
	var latestUpdate *time.Time
	privateCount := 0
	archivedCount := 0
	staleCount := 0

	for _, repo := range items {
		if repo.Language != nil && *repo.Language != "" {
			languageCounts[*repo.Language]++
		}
		if repo.Visibility == "private" {
			privateCount++
		}
		if repo.Archived {
			archivedCount++
		}
		if repo.DefaultBranch != "" {
			branchCounts[repo.DefaultBranch]++
		}

		if pushed, err := time.Parse(time.RFC3339, repo.LastPushedAt); err == nil {
			if latestPush == nil || pushed.After(*latestPush) {
				latestPush = &pushed
			}
			if now.Sub(pushed) > 30*24*time.Hour {
				staleCount++
			}
		}

		if updated, err := time.Parse(time.RFC3339, repo.LastUpdatedAt); err == nil {
			if latestUpdate == nil || updated.After(*latestUpdate) {
				latestUpdate = &updated
			}
		}
	}

	languages := make([]LanguageSlice, 0, len(languageCounts))
	for name, count := range languageCounts {
		percent := 0.0
		if total > 0 {
			percent = math.Round((float64(count)/float64(total))*1000) / 10
		}
		languages = append(languages, LanguageSlice{
			Name:    name,
			Count:   count,
			Percent: percent,
		})
	}

	sort.Slice(languages, func(i, j int) bool {
		return languages[i].Count > languages[j].Count
	})
	if len(languages) > 8 {
		languages = languages[:8]
	}

	defaultBranches := make([]DefaultBranchSlice, 0, len(branchCounts))
	for name, count := range branchCounts {
		percent := 0.0
		if total > 0 {
			percent = math.Round((float64(count)/float64(total))*1000) / 10
		}
		defaultBranches = append(defaultBranches, DefaultBranchSlice{
			Name:    name,
			Count:   count,
			Percent: percent,
		})
	}

	sort.Slice(defaultBranches, func(i, j int) bool {
		return defaultBranches[i].Count > defaultBranches[j].Count
	})

	var latestPushISO *string
	if latestPush != nil {
		value := latestPush.UTC().Format(time.RFC3339)
		latestPushISO = &value
	}
	var latestUpdateISO *string
	if latestUpdate != nil {
		value := latestUpdate.UTC().Format(time.RFC3339)
		latestUpdateISO = &value
	}

	return BaseRepoSnapshot{
		Totals: TotalsSnapshot{
			Repos:         total,
			PrivateCount:  privateCount,
			ArchivedCount: archivedCount,
			StaleCount30d: staleCount,
			LatestPush:    latestPushISO,
			LatestUpdate:  latestUpdateISO,
		},
		Languages:       languages,
		DefaultBranches: defaultBranches,
	}
}

// BuildEmptySnapshot returns an empty snapshot ready for population.
func BuildEmptySnapshot() RepoSnapshot {
	return RepoSnapshot{
		Version: SnapshotVersion,
		Totals: TotalsSnapshot{
			Repos:         0,
			PrivateCount:  0,
			ArchivedCount: 0,
			StaleCount30d: 0,
			LatestPush:    nil,
			LatestUpdate:  nil,
		},
		Languages:       []LanguageSlice{},
		DefaultBranches: []DefaultBranchSlice{},
		Contributors: ContributorsSnapshot{
			Total:           0,
			TopContributors: []Contributor{},
		},
		Contributions: ContributionsTimeline{
			Weeks:         []AggregateWeek{},
			ByRepo:        []RepoTimeline{},
			ByContributor: []ContributorCommits{},
			AnalyzedRepos: 0,
		},
		Security: SecuritySnapshot{
			DependabotEnabledPct: nil,
			CodeQLEnabledPct:     nil,
			BranchProtectionPct:  nil,
			PRWorkflowPct:        nil,
			ProblematicRepos:     []ProblematicRepo{},
		},
		Governance: GovernanceSnapshot{
			RepoPolicies: []RepoPolicySnapshot{},
		},
	}
}

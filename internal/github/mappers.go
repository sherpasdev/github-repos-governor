package github

import "github-repos-governor/internal/models"

func MapToRepoSummary(repo Repository) models.RepoSummary {
	return models.RepoSummary{
		ID:                  repo.ID,
		Name:                repo.Name,
		Description:         repo.Description,
		Language:            repo.Language,
		Visibility:          repo.Visibility,
		LastPushedAt:        repo.PushedAt,
		LastUpdatedAt:       repo.UpdatedAt,
		Stars:               repo.Stargazers,
		Forks:               repo.Forks,
		Issues:              repo.OpenIssues,
		DefaultBranch:       repo.DefaultBranch,
		HTMLURL:             repo.HTMLURL,
		Size:                repo.Size,
		Archived:            repo.Archived,
		Topics:              append([]string{}, repo.Topics...),
		DeleteBranchOnMerge: repo.DeleteBranchOnMerge,
		AllowAutoMerge:      repo.AllowAutoMerge,
		AllowUpdateBranch:   repo.AllowUpdateBranch,
	}
}

func MapToRepoDetail(repo Repository) models.RepoDetail {
	var license *string
	if repo.License != nil && repo.License.Name != "" {
		license = &repo.License.Name
	}

	return models.RepoDetail{
		ID:            repo.ID,
		Name:          repo.Name,
		FullName:      repo.FullName,
		Description:   repo.Description,
		Language:      repo.Language,
		Homepage:      repo.Homepage,
		Visibility:    repo.Visibility,
		Watchers:      repo.Watchers,
		Private:       repo.Private,
		Disabled:      repo.Disabled,
		CreatedAt:     repo.CreatedAt,
		UpdatedAt:     repo.UpdatedAt,
		PushedAt:      repo.PushedAt,
		Stars:         repo.Stargazers,
		Forks:         repo.Forks,
		Issues:        repo.OpenIssues,
		DefaultBranch: repo.DefaultBranch,
		HTMLURL:       repo.HTMLURL,
		Size:          repo.Size,
		Archived:      repo.Archived,
		Topics:        append([]string{}, repo.Topics...),
		License:       license,
	}
}

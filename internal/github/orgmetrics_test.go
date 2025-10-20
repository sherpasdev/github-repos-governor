package github

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func loadFixture(t *testing.T) []Repository {
	t.Helper()
	path := filepath.Join("testdata", "repos.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	var repos []Repository
	if err := json.Unmarshal(data, &repos); err != nil {
		t.Fatalf("unmarshal fixture: %v", err)
	}
	if len(repos) == 0 {
		t.Fatalf("fixture empty")
	}
	return repos
}

func TestRepoPolicySecurityFields(t *testing.T) {
	repos := loadFixture(t)
	repo := repos[0]
	detail := repo

	pushed := selectString(detail.PushedAt, repo.PushedAt)
	if pushed == nil || *pushed != repo.PushedAt {
		t.Fatalf("expected pushed at %s, got %v", repo.PushedAt, pushed)
	}

	advanced := selectBoolFromSecurity(detail.SecurityAndAnalysis, repo.SecurityAndAnalysis)
	if advanced == nil || !*advanced {
		t.Fatalf("expected advanced security true, got %v", advanced)
	}

	depGraph := selectDependencyGraph(detail.SecurityAndAnalysis, repo.SecurityAndAnalysis)
	if depGraph == nil || !*depGraph {
		t.Fatalf("expected dependency graph true, got %v", depGraph)
	}

	status := selectSecurityStatus(detail.SecurityAndAnalysis, repo.SecurityAndAnalysis, advancedSecurityExtractor{})
	if status == nil || *status != "enabled_on" {
		t.Fatalf("expected advanced security status 'enabled_on', got %v", status)
	}

	graphStatus := selectSecurityStatus(detail.SecurityAndAnalysis, repo.SecurityAndAnalysis, dependencyGraphExtractor{})
	if graphStatus == nil || *graphStatus != "enabled_managed" {
		t.Fatalf("expected dependency graph status 'enabled_managed', got %v", graphStatus)
	}
}

func TestRepoPolicySecurityFallback(t *testing.T) {
	repos := loadFixture(t)
	if len(repos) < 2 {
		t.Fatalf("expected at least two repos")
	}
	repo := repos[1]

	// simulate detail missing security block so we fall back to repository value
	detail := repo
	detail.SecurityAndAnalysis = nil

	advanced := selectBoolFromSecurity(detail.SecurityAndAnalysis, repo.SecurityAndAnalysis)
	if advanced == nil || *advanced {
		t.Fatalf("expected advanced security false, got %v", advanced)
	}

    depGraph := selectDependencyGraph(detail.SecurityAndAnalysis, repo.SecurityAndAnalysis)
    if depGraph != nil {
        t.Fatalf("expected dependency graph unknown (nil), got %v", depGraph)
    }

	status := selectSecurityStatus(detail.SecurityAndAnalysis, repo.SecurityAndAnalysis, advancedSecurityExtractor{})
	if status == nil || *status != "disabled_by_org_policy" {
		t.Fatalf("expected advanced security status 'disabled_by_org_policy', got %v", status)
	}

	graphStatus := selectSecurityStatus(detail.SecurityAndAnalysis, repo.SecurityAndAnalysis, dependencyGraphExtractor{})
	if graphStatus == nil || *graphStatus != "not_available" {
		t.Fatalf("expected dependency graph status 'not_available', got %v", graphStatus)
	}
}

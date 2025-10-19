import type { RepoSummary } from "./github/types";

export type LanguageSlice = {
  name: string;
  count: number;
  percent: number;
};

export type DefaultBranchSlice = {
  name: string;
  count: number;
  percent: number;
};

export type TotalsSnapshot = {
  repos: number;
  privateCount: number;
  archivedCount: number;
  staleCount30d: number;
  latestPush: string | null;
  latestUpdate: string | null;
};

export type BranchProtectionSnapshot = {
  enabled: boolean;
  requiredApprovingReviewCount: number | null;
  dismissStaleReviews: boolean;
  requireCodeOwnerReviews: boolean;
  requiredStatusChecks: {
    strict: boolean;
    contexts: string[];
  } | null;
  allowsForcePushes: boolean | null;
};

export type RepoPolicySnapshot = {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
  branchProtection: BranchProtectionSnapshot;
  deleteBranchOnMerge: boolean | null;
  allowAutoMerge: boolean | null;
  allowUpdateBranch: boolean | null;
};

export type GovernanceSnapshot = {
  repoPolicies: RepoPolicySnapshot[];
};

export type ContributorsSnapshot = {
  total: number;
  topContributors: Array<{ login: string; commits: number }>;
};

export type ContributionsTimeline = {
  weeks: Array<{ weekStart: string; totalCommits: number }>;
  byRepo: Array<{
    repo: string;
    data: Array<{ weekStart: string; commits: number }>;
  }>;
  byContributor: Array<{ login: string; totalCommits: number }>;
  analyzedRepos: number;
};

export type SecuritySnapshot = {
  dependabotEnabledPct: number | null;
  codeqlEnabledPct: number | null;
  branchProtectionPct: number | null;
  prWorkflowPct: number | null;
  problematicRepos: Array<{
    repo: string;
    htmlUrl: string;
    reasons: string[];
  }>;
};

export type RepoSnapshot = {
  version: number;
  totals: TotalsSnapshot;
  languages: LanguageSlice[];
  defaultBranches: DefaultBranchSlice[];
  contributors: ContributorsSnapshot;
  contributions: ContributionsTimeline;
  security: SecuritySnapshot;
  governance: GovernanceSnapshot;
};

export type BaseRepoSnapshot = {
  totals: TotalsSnapshot;
  languages: LanguageSlice[];
  defaultBranches: DefaultBranchSlice[];
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
export const SNAPSHOT_VERSION = 2;

export function buildRepoBaseSnapshot(items: RepoSummary[]): BaseRepoSnapshot {
  const total = items.length;

  const now = Date.now();
  const languageCounts = new Map<string, number>();
  const branchCounts = new Map<string, number>();
  let latestPush: number | null = null;
  let latestUpdate: number | null = null;
  let privateCount = 0;
  let archivedCount = 0;
  let staleCount30d = 0;

  for (const repo of items) {
    if (repo.language) {
      languageCounts.set(
        repo.language,
        (languageCounts.get(repo.language) ?? 0) + 1
      );
    }

    if (repo.visibility === "private") {
      privateCount += 1;
    }

    if (repo.archived) {
      archivedCount += 1;
    }

    if (repo.defaultBranch) {
      branchCounts.set(
        repo.defaultBranch,
        (branchCounts.get(repo.defaultBranch) ?? 0) + 1
      );
    }

    const pushedAt = Date.parse(repo.lastPushedAt);
    if (!Number.isNaN(pushedAt)) {
      latestPush =
        latestPush === null ? pushedAt : Math.max(latestPush, pushedAt);
      if (now - pushedAt > THIRTY_DAYS_MS) {
        staleCount30d += 1;
      }
    }

    const updatedAt = Date.parse(repo.lastUpdatedAt);
    if (!Number.isNaN(updatedAt)) {
      latestUpdate =
        latestUpdate === null ? updatedAt : Math.max(latestUpdate, updatedAt);
    }
  }

  const languages = Array.from(languageCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percent: total === 0 ? 0 : Number(((count / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const defaultBranches = Array.from(branchCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percent: total === 0 ? 0 : Number(((count / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totals: {
      repos: total,
      privateCount,
      archivedCount,
      staleCount30d,
      latestPush: latestPush ? new Date(latestPush).toISOString() : null,
      latestUpdate: latestUpdate ? new Date(latestUpdate).toISOString() : null,
    },
    languages,
    defaultBranches,
  };
}

export function buildEmptySnapshot(): RepoSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    totals: {
      repos: 0,
      privateCount: 0,
      archivedCount: 0,
      staleCount30d: 0,
      latestPush: null,
      latestUpdate: null,
    },
    languages: [],
    defaultBranches: [],
    contributors: {
      total: 0,
      topContributors: [],
    },
    contributions: {
      weeks: [],
      byRepo: [],
      byContributor: [],
      analyzedRepos: 0,
    },
    security: {
      dependabotEnabledPct: null,
      codeqlEnabledPct: null,
      branchProtectionPct: null,
      prWorkflowPct: null,
      problematicRepos: [],
    },
    governance: {
      repoPolicies: [],
    },
  };
}

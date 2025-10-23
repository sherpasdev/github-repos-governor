import {
  ApplyGovernanceActions as applyGovernanceActionsNative,
  EnvironmentStatus as fetchEnvironmentStatusNative,
  GetOrganizationSummary as getOrganizationSummaryNative,
  GetRepositoryDetail as getRepositoryDetailNative,
  GetSettings as getSettingsNative,
  ListRepositories as listRepositoriesNative,
  RefreshOrganizationSummary as refreshOrganizationSummaryNative,
  SaveSettings as saveSettingsNative,
} from "../../wailsjs/go/main/App";
import { github, main } from "../../wailsjs/go/models";
import type {
  Direction,
  RepoListFiltersPayload,
  RepoSummary,
  SortOption,
  VisibilityOption,
  RepoDetail,
  RateLimitInfo,
} from "@/lib/github/types";
import type { RepoSnapshot } from "@/lib/repoSnapshot";

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type EnvironmentStatusResponse = {
  ready: boolean;
  missing: string[];
  organization: string | null;
  apiBaseUrl: string;
  configPath: string | null;
  loadError: string | null;
  version: string;
};

export async function fetchEnvironmentStatus(): Promise<EnvironmentStatusResponse> {
  const payload = await fetchEnvironmentStatusNative();
  const plain = toPlain(payload) as {
    ready: boolean;
    missing: string[];
    organization?: string;
    apiBaseUrl: string;
    configPath?: string;
    loadError?: string;
    version?: string;
  };
  return {
    ready: plain.ready,
    missing: plain.missing ?? [],
    organization: plain.organization ?? null,
    apiBaseUrl: plain.apiBaseUrl,
    configPath: plain.configPath ?? null,
    loadError: plain.loadError ?? null,
    version: plain.version ?? "dev",
  };
}

export type RepoListResponse = {
  items: RepoSummary[];
  pagination: {
    page: number;
    perPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: {
    search: string | null;
    sort: SortOption;
    direction: Direction;
    visibility: VisibilityOption;
  };
  rateLimit: RateLimitInfo;
  organization: string | null;
  fetchedAt: string;
};

export async function listRepositories(
  filters: RepoListFiltersPayload
): Promise<RepoListResponse> {
  const request = {
    page: filters.page ?? 1,
    perPage: filters.perPage ?? 50,
    search: filters.search ?? "",
    sort: filters.sort ?? "updated",
    direction: filters.direction ?? "desc",
    visibility: filters.visibility ?? "all",
  };

  const response = await listRepositoriesNative(request);
  const plain = toPlain(response) as {
    items: RepoSummary[];
    pagination: RepoListResponse["pagination"];
    filters: {
      search?: string;
      sort: SortOption;
      direction: Direction;
      visibility: VisibilityOption;
    };
    rateLimit: RateLimitInfo;
    organization?: string;
    fetchedAt: string;
  };

  return {
    items: plain.items ?? [],
    pagination: plain.pagination,
    filters: {
      search: plain.filters?.search ?? null,
      sort: plain.filters?.sort ?? "updated",
      direction: plain.filters?.direction ?? "desc",
      visibility: plain.filters?.visibility ?? "all",
    },
    rateLimit: plain.rateLimit ?? {
      remaining: null,
      limit: null,
      reset: null,
    },
    organization: plain.organization ?? null,
    fetchedAt: plain.fetchedAt,
  };
}

export type RepoSummaryResponse = {
  summary: RepoSnapshot;
  count: number;
  organization: string | null;
  rateLimit: RateLimitInfo;
  fetchedAt: string;
  cache: {
    available: boolean;
    createdAt: string | null;
    refreshed: boolean;
  };
};

export type RefreshSummaryResponse = {
  summary: RepoSnapshot;
  count: number;
  organization: string | null;
  rateLimit: RateLimitInfo;
  fetchedAt: string;
  logs: string[];
};

export async function getOrganizationSummary(): Promise<RepoSummaryResponse> {
  const response = await getOrganizationSummaryNative();
  const plain = toPlain(response) as {
    summary: RepoSnapshot;
    count: number;
    organization?: string;
    rateLimit: RateLimitInfo;
    fetchedAt: string;
    cache: {
      available: boolean;
      createdAt?: string;
      refreshed: boolean;
    };
  };

  return {
    summary: plain.summary,
    count: plain.count,
    organization: plain.organization ?? null,
    rateLimit: plain.rateLimit ?? {
      remaining: null,
      limit: null,
      reset: null,
    },
    fetchedAt: plain.fetchedAt,
    cache: {
      available: plain.cache?.available ?? false,
      createdAt: plain.cache?.createdAt ?? null,
      refreshed: plain.cache?.refreshed ?? false,
    },
  };
}

export async function refreshOrganizationSummary(): Promise<RefreshSummaryResponse> {
  const response = await refreshOrganizationSummaryNative();
  const plain = toPlain(response) as {
    summary: RepoSnapshot;
    count: number;
    organization?: string;
    rateLimit: RateLimitInfo;
    fetchedAt: string;
    logs?: string[];
  };

  return {
    summary: plain.summary,
    count: plain.count,
    organization: plain.organization ?? null,
    rateLimit: plain.rateLimit ?? {
      remaining: null,
      limit: null,
      reset: null,
    },
    fetchedAt: plain.fetchedAt,
    logs: plain.logs ?? [],
  };
}

export type RepoDetailResponse = {
  repository: RepoDetail;
  organization: string | null;
  rateLimit: RateLimitInfo;
  fetchedAt: string;
};

export async function getRepositoryDetail(
  name: string
): Promise<RepoDetailResponse> {
  const response = await getRepositoryDetailNative(name);
  const plain = toPlain(response) as {
    repository: RepoDetail;
    organization?: string;
    rateLimit: RateLimitInfo;
    fetchedAt: string;
  };

  return {
    repository: plain.repository,
    organization: plain.organization ?? null,
    rateLimit: plain.rateLimit ?? {
      remaining: null,
      limit: null,
      reset: null,
    },
    fetchedAt: plain.fetchedAt,
  };
}

export type GovernanceActionPayload = {
  targetDefaultBranch?: string;
  branchProtection?: {
    approvalsRequired: number;
    dismissStaleReviews: boolean;
    requireCodeOwners: boolean;
    strictStatusChecks: boolean;
    statusCheckContexts: string[];
    restrictForcePushes: boolean;
    requireUpToDate?: boolean;
  };
  repoSettings?: {
    deleteBranchOnMerge?: boolean;
    allowUpdateBranch?: boolean;
    allowAutoMerge?: boolean;
  };
  repos?: string[];
};

export type GovernanceResult = {
  repo: string;
  action: string;
  success: boolean;
  message?: string;
  repoId?: number;
  changes?: GovernanceActionPayload["repoSettings"];
};

export type GovernanceResponse = {
  results: GovernanceResult[];
  stats: {
    totalReposAffected: number;
    successes: number;
    failures: number;
  };
  snapshot?: RepoSnapshot;
  count: number;
};

export async function applyGovernanceActions(
  payload: GovernanceActionPayload
): Promise<GovernanceResponse> {
  const request = github.GovernanceActionRequest.createFrom({
    targetDefaultBranch: payload.targetDefaultBranch,
    branchProtection: payload.branchProtection,
    repoSettings: payload.repoSettings,
    repos: payload.repos ?? [],
  });

  const response = await applyGovernanceActionsNative(request);

  const plain = toPlain(response) as {
    results: GovernanceResult[];
    stats?: {
      totalReposAffected?: number;
      successes?: number;
      failures?: number;
    };
    snapshot?: RepoSnapshot;
    count: number;
  };

  return {
    results: plain.results ?? [],
    stats: {
      totalReposAffected: plain.stats?.totalReposAffected ?? 0,
      successes: plain.stats?.successes ?? 0,
      failures: plain.stats?.failures ?? 0,
    },
    snapshot: plain.snapshot,
    count: plain.count ?? 0,
  };
}

export type SettingsData = {
  githubToken: string;
  githubOrg: string;
  githubApiBaseUrl: string;
  disableCache: boolean;
  cacheDir: string;
  ignoreArchived: boolean;
  configPath: string;
};

export async function getSettings(): Promise<SettingsData> {
  const response = await getSettingsNative();
  const plain = toPlain(response) as SettingsData;
  return {
    githubToken: plain.githubToken ?? "",
    githubOrg: plain.githubOrg ?? "",
    githubApiBaseUrl: plain.githubApiBaseUrl ?? "https://api.github.com",
    disableCache: Boolean(plain.disableCache),
    cacheDir: plain.cacheDir ?? "",
    ignoreArchived: plain.ignoreArchived ?? true,
    configPath: plain.configPath ?? "",
  };
}

export async function saveSettings(settings: SettingsData): Promise<void> {
  const payload = main.SettingsPayload.createFrom(settings);
  await saveSettingsNative(payload);
}

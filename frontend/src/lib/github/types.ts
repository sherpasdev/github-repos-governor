export type RateLimitInfo = {
  remaining: number | null;
  limit: number | null;
  reset: number | null;
};

export type RepoSummary = {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  visibility: "public" | "private" | "internal";
  lastPushedAt: string;
  lastUpdatedAt: string;
  stars: number;
  forks: number;
  issues: number;
  defaultBranch: string;
  htmlUrl: string;
  size: number;
  archived: boolean;
  topics: string[];
  deleteBranchOnMerge: boolean | null;
  allowAutoMerge: boolean | null;
  allowUpdateBranch: boolean | null;
};

export type RepoDetail = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  homepage: string | null;
  visibility: "public" | "private" | "internal";
  watchers: number;
  private: boolean;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  stars: number;
  forks: number;
  issues: number;
  defaultBranch: string;
  htmlUrl: string;
  size: number;
  archived: boolean;
  topics: string[];
  license: string | null;
};

export type RepoListFiltersPayload = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: SortOption;
  direction?: Direction;
  visibility?: VisibilityOption;
};

export type Direction = "asc" | "desc";

export type SortOption =
  | "updated"
  | "pushed"
  | "created"
  | "name"
  | "stars"
  | "forks"
  | "issues"
  | "size";

export type VisibilityOption =
  | "all"
  | "public"
  | "private"
  | "internal"
  | "forks"
  | "sources";

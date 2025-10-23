export namespace github {
	
	export class BranchProtectionOptions {
	    approvalsRequired: number;
	    dismissStaleReviews: boolean;
	    requireCodeOwners: boolean;
	    strictStatusChecks: boolean;
	    statusCheckContexts: string[];
	    restrictForcePushes: boolean;
	    requireUpToDate?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new BranchProtectionOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.approvalsRequired = source["approvalsRequired"];
	        this.dismissStaleReviews = source["dismissStaleReviews"];
	        this.requireCodeOwners = source["requireCodeOwners"];
	        this.strictStatusChecks = source["strictStatusChecks"];
	        this.statusCheckContexts = source["statusCheckContexts"];
	        this.restrictForcePushes = source["restrictForcePushes"];
	        this.requireUpToDate = source["requireUpToDate"];
	    }
	}
	export class RepoSettingsOptions {
	    deleteBranchOnMerge?: boolean;
	    allowUpdateBranch?: boolean;
	    allowAutoMerge?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RepoSettingsOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.deleteBranchOnMerge = source["deleteBranchOnMerge"];
	        this.allowUpdateBranch = source["allowUpdateBranch"];
	        this.allowAutoMerge = source["allowAutoMerge"];
	    }
	}
	export class GovernanceActionRequest {
	    targetDefaultBranch?: string;
	    branchProtection?: BranchProtectionOptions;
	    repoSettings?: RepoSettingsOptions;
	    repos: string[];
	
	    static createFrom(source: any = {}) {
	        return new GovernanceActionRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.targetDefaultBranch = source["targetDefaultBranch"];
	        this.branchProtection = this.convertValues(source["branchProtection"], BranchProtectionOptions);
	        this.repoSettings = this.convertValues(source["repoSettings"], RepoSettingsOptions);
	        this.repos = source["repos"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GovernanceActionResult {
	    repo: string;
	    action: string;
	    success: boolean;
	    message?: string;
	    repoId?: number;
	    changes?: RepoSettingsOptions;
	
	    static createFrom(source: any = {}) {
	        return new GovernanceActionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repo = source["repo"];
	        this.action = source["action"];
	        this.success = source["success"];
	        this.message = source["message"];
	        this.repoId = source["repoId"];
	        this.changes = this.convertValues(source["changes"], RepoSettingsOptions);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GovernanceResponse {
	    results: GovernanceActionResult[];
	    // Go type: struct { TotalReposAffected int "json:\"totalReposAffected\""; Successes int "json:\"successes\""; Failures int "json:\"failures\"" }
	    stats: any;
	    snapshot?: models.RepoSnapshot;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new GovernanceResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.results = this.convertValues(source["results"], GovernanceActionResult);
	        this.stats = this.convertValues(source["stats"], Object);
	        this.snapshot = this.convertValues(source["snapshot"], models.RepoSnapshot);
	        this.count = source["count"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class CacheMetadata {
	    available: boolean;
	    createdAt?: string;
	    refreshed: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CacheMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.createdAt = source["createdAt"];
	        this.refreshed = source["refreshed"];
	    }
	}
	export class EnvironmentStatus {
	    ready: boolean;
	    missing: string[];
	    organization?: string;
	    apiBaseUrl: string;
	    configPath: string;
	    loadError: string;
	    version: string;
	
	    static createFrom(source: any = {}) {
	        return new EnvironmentStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ready = source["ready"];
	        this.missing = source["missing"];
	        this.organization = source["organization"];
	        this.apiBaseUrl = source["apiBaseUrl"];
	        this.configPath = source["configPath"];
	        this.loadError = source["loadError"];
	        this.version = source["version"];
	    }
	}
	export class RefreshSummaryResponse {
	    summary: models.RepoSnapshot;
	    count: number;
	    organization?: string;
	    rateLimit: models.RateLimitInfo;
	    fetchedAt: string;
	    logs: string[];
	
	    static createFrom(source: any = {}) {
	        return new RefreshSummaryResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.summary = this.convertValues(source["summary"], models.RepoSnapshot);
	        this.count = source["count"];
	        this.organization = source["organization"];
	        this.rateLimit = this.convertValues(source["rateLimit"], models.RateLimitInfo);
	        this.fetchedAt = source["fetchedAt"];
	        this.logs = source["logs"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RepoDetailResponse {
	    repository: models.RepoDetail;
	    organization?: string;
	    rateLimit: models.RateLimitInfo;
	    fetchedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new RepoDetailResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repository = this.convertValues(source["repository"], models.RepoDetail);
	        this.organization = source["organization"];
	        this.rateLimit = this.convertValues(source["rateLimit"], models.RateLimitInfo);
	        this.fetchedAt = source["fetchedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RepoListFilters {
	    search?: string;
	    sort: string;
	    direction: string;
	    visibility: string;
	
	    static createFrom(source: any = {}) {
	        return new RepoListFilters(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.search = source["search"];
	        this.sort = source["sort"];
	        this.direction = source["direction"];
	        this.visibility = source["visibility"];
	    }
	}
	export class RepoListRequest {
	    page: number;
	    perPage: number;
	    search: string;
	    sort: string;
	    direction: string;
	    visibility: string;
	
	    static createFrom(source: any = {}) {
	        return new RepoListRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.perPage = source["perPage"];
	        this.search = source["search"];
	        this.sort = source["sort"];
	        this.direction = source["direction"];
	        this.visibility = source["visibility"];
	    }
	}
	export class RepoPagination {
	    page: number;
	    perPage: number;
	    hasNextPage: boolean;
	    hasPrevPage: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RepoPagination(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.perPage = source["perPage"];
	        this.hasNextPage = source["hasNextPage"];
	        this.hasPrevPage = source["hasPrevPage"];
	    }
	}
	export class RepoListResponse {
	    items: models.RepoSummary[];
	    pagination: RepoPagination;
	    filters: RepoListFilters;
	    rateLimit: models.RateLimitInfo;
	    organization?: string;
	    fetchedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new RepoListResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], models.RepoSummary);
	        this.pagination = this.convertValues(source["pagination"], RepoPagination);
	        this.filters = this.convertValues(source["filters"], RepoListFilters);
	        this.rateLimit = this.convertValues(source["rateLimit"], models.RateLimitInfo);
	        this.organization = source["organization"];
	        this.fetchedAt = source["fetchedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class RepoSummaryResponse {
	    summary: models.RepoSnapshot;
	    count: number;
	    organization?: string;
	    rateLimit: models.RateLimitInfo;
	    fetchedAt: string;
	    cache: CacheMetadata;
	
	    static createFrom(source: any = {}) {
	        return new RepoSummaryResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.summary = this.convertValues(source["summary"], models.RepoSnapshot);
	        this.count = source["count"];
	        this.organization = source["organization"];
	        this.rateLimit = this.convertValues(source["rateLimit"], models.RateLimitInfo);
	        this.fetchedAt = source["fetchedAt"];
	        this.cache = this.convertValues(source["cache"], CacheMetadata);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SettingsPayload {
	    githubToken: string;
	    githubOrg: string;
	    githubApiBaseUrl: string;
	    disableCache: boolean;
	    cacheDir: string;
	    ignoreArchived: boolean;
	    configPath: string;
	
	    static createFrom(source: any = {}) {
	        return new SettingsPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.githubToken = source["githubToken"];
	        this.githubOrg = source["githubOrg"];
	        this.githubApiBaseUrl = source["githubApiBaseUrl"];
	        this.disableCache = source["disableCache"];
	        this.cacheDir = source["cacheDir"];
	        this.ignoreArchived = source["ignoreArchived"];
	        this.configPath = source["configPath"];
	    }
	}

}

export namespace models {
	
	export class AggregateWeek {
	    weekStart: string;
	    totalCommits: number;
	
	    static createFrom(source: any = {}) {
	        return new AggregateWeek(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.weekStart = source["weekStart"];
	        this.totalCommits = source["totalCommits"];
	    }
	}
	export class StatusChecks {
	    strict: boolean;
	    contexts: string[];
	
	    static createFrom(source: any = {}) {
	        return new StatusChecks(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.strict = source["strict"];
	        this.contexts = source["contexts"];
	    }
	}
	export class BranchProtectionSnapshot {
	    enabled: boolean;
	    requiredApprovingReviewCount?: number;
	    dismissStaleReviews: boolean;
	    requireCodeOwnerReviews: boolean;
	    requiredStatusChecks?: StatusChecks;
	    allowsForcePushes?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new BranchProtectionSnapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.requiredApprovingReviewCount = source["requiredApprovingReviewCount"];
	        this.dismissStaleReviews = source["dismissStaleReviews"];
	        this.requireCodeOwnerReviews = source["requireCodeOwnerReviews"];
	        this.requiredStatusChecks = this.convertValues(source["requiredStatusChecks"], StatusChecks);
	        this.allowsForcePushes = source["allowsForcePushes"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ContributorCommits {
	    login: string;
	    totalCommits: number;
	
	    static createFrom(source: any = {}) {
	        return new ContributorCommits(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.login = source["login"];
	        this.totalCommits = source["totalCommits"];
	    }
	}
	export class WeeklyCommits {
	    weekStart: string;
	    commits: number;
	
	    static createFrom(source: any = {}) {
	        return new WeeklyCommits(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.weekStart = source["weekStart"];
	        this.commits = source["commits"];
	    }
	}
	export class RepoTimeline {
	    repo: string;
	    data: WeeklyCommits[];
	
	    static createFrom(source: any = {}) {
	        return new RepoTimeline(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repo = source["repo"];
	        this.data = this.convertValues(source["data"], WeeklyCommits);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ContributionsTimeline {
	    weeks: AggregateWeek[];
	    byRepo: RepoTimeline[];
	    byContributor: ContributorCommits[];
	    analyzedRepos: number;
	
	    static createFrom(source: any = {}) {
	        return new ContributionsTimeline(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.weeks = this.convertValues(source["weeks"], AggregateWeek);
	        this.byRepo = this.convertValues(source["byRepo"], RepoTimeline);
	        this.byContributor = this.convertValues(source["byContributor"], ContributorCommits);
	        this.analyzedRepos = source["analyzedRepos"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Contributor {
	    login: string;
	    commits: number;
	
	    static createFrom(source: any = {}) {
	        return new Contributor(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.login = source["login"];
	        this.commits = source["commits"];
	    }
	}
	
	export class ContributorsSnapshot {
	    total: number;
	    topContributors: Contributor[];
	
	    static createFrom(source: any = {}) {
	        return new ContributorsSnapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total = source["total"];
	        this.topContributors = this.convertValues(source["topContributors"], Contributor);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DefaultBranchSlice {
	    name: string;
	    count: number;
	    percent: number;
	
	    static createFrom(source: any = {}) {
	        return new DefaultBranchSlice(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.count = source["count"];
	        this.percent = source["percent"];
	    }
	}
	export class RepoPolicySnapshot {
	    id: number;
	    name: string;
	    fullName: string;
	    htmlUrl: string;
	    defaultBranch: string;
	    defaultBranchPushedAt?: string;
	    advancedSecurityEnabled?: boolean;
	    advancedSecurityStatus?: string;
	    dependencyGraphEnabled?: boolean;
	    dependencyGraphStatus?: string;
	    branchProtection: BranchProtectionSnapshot;
	    deleteBranchOnMerge?: boolean;
	    allowAutoMerge?: boolean;
	    allowUpdateBranch?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RepoPolicySnapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.fullName = source["fullName"];
	        this.htmlUrl = source["htmlUrl"];
	        this.defaultBranch = source["defaultBranch"];
	        this.defaultBranchPushedAt = source["defaultBranchPushedAt"];
	        this.advancedSecurityEnabled = source["advancedSecurityEnabled"];
	        this.advancedSecurityStatus = source["advancedSecurityStatus"];
	        this.dependencyGraphEnabled = source["dependencyGraphEnabled"];
	        this.dependencyGraphStatus = source["dependencyGraphStatus"];
	        this.branchProtection = this.convertValues(source["branchProtection"], BranchProtectionSnapshot);
	        this.deleteBranchOnMerge = source["deleteBranchOnMerge"];
	        this.allowAutoMerge = source["allowAutoMerge"];
	        this.allowUpdateBranch = source["allowUpdateBranch"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GovernanceSnapshot {
	    repoPolicies: RepoPolicySnapshot[];
	
	    static createFrom(source: any = {}) {
	        return new GovernanceSnapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repoPolicies = this.convertValues(source["repoPolicies"], RepoPolicySnapshot);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LanguageSlice {
	    name: string;
	    count: number;
	    percent: number;
	
	    static createFrom(source: any = {}) {
	        return new LanguageSlice(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.count = source["count"];
	        this.percent = source["percent"];
	    }
	}
	export class ProblematicRepo {
	    repo: string;
	    htmlUrl: string;
	    reasons: string[];
	
	    static createFrom(source: any = {}) {
	        return new ProblematicRepo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repo = source["repo"];
	        this.htmlUrl = source["htmlUrl"];
	        this.reasons = source["reasons"];
	    }
	}
	export class RateLimitInfo {
	    remaining?: number;
	    limit?: number;
	    reset?: number;
	
	    static createFrom(source: any = {}) {
	        return new RateLimitInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.remaining = source["remaining"];
	        this.limit = source["limit"];
	        this.reset = source["reset"];
	    }
	}
	export class RepoDetail {
	    id: number;
	    name: string;
	    fullName: string;
	    description?: string;
	    language?: string;
	    homepage?: string;
	    visibility: string;
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
	    license?: string;
	
	    static createFrom(source: any = {}) {
	        return new RepoDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.fullName = source["fullName"];
	        this.description = source["description"];
	        this.language = source["language"];
	        this.homepage = source["homepage"];
	        this.visibility = source["visibility"];
	        this.watchers = source["watchers"];
	        this.private = source["private"];
	        this.disabled = source["disabled"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	        this.pushedAt = source["pushedAt"];
	        this.stars = source["stars"];
	        this.forks = source["forks"];
	        this.issues = source["issues"];
	        this.defaultBranch = source["defaultBranch"];
	        this.htmlUrl = source["htmlUrl"];
	        this.size = source["size"];
	        this.archived = source["archived"];
	        this.topics = source["topics"];
	        this.license = source["license"];
	    }
	}
	
	export class SecuritySnapshot {
	    dependabotEnabledPct?: number;
	    codeqlEnabledPct?: number;
	    branchProtectionPct?: number;
	    prWorkflowPct?: number;
	    problematicRepos: ProblematicRepo[];
	
	    static createFrom(source: any = {}) {
	        return new SecuritySnapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.dependabotEnabledPct = source["dependabotEnabledPct"];
	        this.codeqlEnabledPct = source["codeqlEnabledPct"];
	        this.branchProtectionPct = source["branchProtectionPct"];
	        this.prWorkflowPct = source["prWorkflowPct"];
	        this.problematicRepos = this.convertValues(source["problematicRepos"], ProblematicRepo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TotalsSnapshot {
	    repos: number;
	    privateCount: number;
	    archivedCount: number;
	    staleCount30d: number;
	    latestPush?: string;
	    latestUpdate?: string;
	
	    static createFrom(source: any = {}) {
	        return new TotalsSnapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repos = source["repos"];
	        this.privateCount = source["privateCount"];
	        this.archivedCount = source["archivedCount"];
	        this.staleCount30d = source["staleCount30d"];
	        this.latestPush = source["latestPush"];
	        this.latestUpdate = source["latestUpdate"];
	    }
	}
	export class RepoSnapshot {
	    version: number;
	    totals: TotalsSnapshot;
	    languages: LanguageSlice[];
	    defaultBranches: DefaultBranchSlice[];
	    contributors: ContributorsSnapshot;
	    contributions: ContributionsTimeline;
	    security: SecuritySnapshot;
	    governance: GovernanceSnapshot;
	
	    static createFrom(source: any = {}) {
	        return new RepoSnapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.totals = this.convertValues(source["totals"], TotalsSnapshot);
	        this.languages = this.convertValues(source["languages"], LanguageSlice);
	        this.defaultBranches = this.convertValues(source["defaultBranches"], DefaultBranchSlice);
	        this.contributors = this.convertValues(source["contributors"], ContributorsSnapshot);
	        this.contributions = this.convertValues(source["contributions"], ContributionsTimeline);
	        this.security = this.convertValues(source["security"], SecuritySnapshot);
	        this.governance = this.convertValues(source["governance"], GovernanceSnapshot);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RepoSummary {
	    id: number;
	    name: string;
	    description?: string;
	    language?: string;
	    visibility: string;
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
	    deleteBranchOnMerge?: boolean;
	    allowAutoMerge?: boolean;
	    allowUpdateBranch?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RepoSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.language = source["language"];
	        this.visibility = source["visibility"];
	        this.lastPushedAt = source["lastPushedAt"];
	        this.lastUpdatedAt = source["lastUpdatedAt"];
	        this.stars = source["stars"];
	        this.forks = source["forks"];
	        this.issues = source["issues"];
	        this.defaultBranch = source["defaultBranch"];
	        this.htmlUrl = source["htmlUrl"];
	        this.size = source["size"];
	        this.archived = source["archived"];
	        this.topics = source["topics"];
	        this.deleteBranchOnMerge = source["deleteBranchOnMerge"];
	        this.allowAutoMerge = source["allowAutoMerge"];
	        this.allowUpdateBranch = source["allowUpdateBranch"];
	    }
	}
	
	
	
	

}


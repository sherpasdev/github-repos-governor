export type RepositoriesViewProps = {
  envReady: boolean;
  organization: string | null;
  missingFields: string[];
  configPath?: string | null;
  onSelectRepository: (repoName: string) => void;
  onNotify?: (notification: { type: 'success' | 'error'; message: string }) => void;
};

export type RepoRow = {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
  defaultBranchLastPush: string | null;
  advancedSecurity: boolean | null;
  advancedSecurityStatus: string | null;
  dependencyGraph: boolean | null;
  dependencyGraphStatus: string | null;
  branchProtected: boolean;
  approvalsRequired: number | null;
  statusChecks: string;
  forcePushAllowed: boolean | null;
  deleteBranchOnMerge: boolean | null;
  allowAutoMerge: boolean | null;
  allowUpdateBranch: boolean | null;
};

export type RepoSettingField = 'deleteBranchOnMerge' | 'allowAutoMerge' | 'allowUpdateBranch';

export type ActionState = {
  working: boolean;
  message: string | null;
  error: string | null;
};

import { useCallback, useEffect, useMemo, useState } from "react";

import type { RepoPolicySnapshot, RepoSnapshot } from "@/lib/repoSnapshot";
import {
  applyGovernanceActions,
  getOrganizationSummary,
  type GovernanceActionPayload,
  type GovernanceResponse,
} from "@/services/api";
import styles from "./GovernanceShell.module.css";

type GovernanceShellProps = {
  envReady: boolean;
  organization: string | null;
  missingFields: string[];
  configPath?: string | null;
};

type ActionState = {
  working: boolean;
  message: string | null;
  error: string | null;
};

type SortColumn =
  | "repo"
  | "defaultBranch"
  | "statusChecks"
  | "requiredReviews"
  | "codeOwners"
  | "enforceChecks"
  | "restrictForcePushes"
  | "requireUpToDate"
  | "deleteBranch"
  | "autoMerge"
  | "updateBranch";

type SortDirection = "asc" | "desc";

const INITIAL_ACTION_STATE: ActionState = {
  working: false,
  message: null,
  error: null,
};

const SORTABLE_COLUMNS: SortColumn[] = [
  "repo",
  "defaultBranch",
  "statusChecks",
  "requiredReviews",
  "codeOwners",
  "enforceChecks",
  "restrictForcePushes",
  "requireUpToDate",
  "deleteBranch",
  "autoMerge",
  "updateBranch",
];

function triState(values: boolean[]): "all" | "partial" | "none" {
  if (values.length === 0) return "none";
  const trueCount = values.filter(Boolean).length;
  if (trueCount === values.length) return "all";
  if (trueCount === 0) return "none";
  return "partial";
}

function booleanDisplay(value: boolean | null | undefined) {
  if (value === true) return <span className={styles.booleanYes}>Yes</span>;
  if (value === false) return <span className={styles.booleanNo}>No</span>;
  return <span className={styles.booleanUnknown}>Unknown</span>;
}

function CheckboxIndicator({ state }: { state: "all" | "partial" | "none" }) {
  const className =
    state === "all"
      ? `${styles.checkbox} ${styles.checkboxAll}`
      : state === "partial"
      ? `${styles.checkbox} ${styles.checkboxPartial}`
      : `${styles.checkbox} ${styles.checkboxNone}`;

  const symbol = state === "all" ? "✓" : state === "partial" ? "–" : "×";
  return <span className={className}>{symbol}</span>;
}

export function GovernanceShell({
  envReady,
  organization,
  missingFields,
  configPath,
}: GovernanceShellProps) {
  const [summary, setSummary] = useState<RepoSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(INITIAL_ACTION_STATE);

  const [defaultBranchTarget, setDefaultBranchTarget] = useState("main");
  const [approvalsRequired, setApprovalsRequired] = useState(1);
  const [dismissStaleReviews, setDismissStaleReviews] = useState(true);
  const [requireCodeOwners, setRequireCodeOwners] = useState(true);
  const [strictStatusChecks, setStrictStatusChecks] = useState(true);
  const [statusCheckContexts, setStatusCheckContexts] = useState("build, test");
  const [restrictForcePushes, setRestrictForcePushes] = useState(true);
  const [requireUpToDate, setRequireUpToDate] = useState(true);

  const [deleteBranchOnMerge, setDeleteBranchOnMerge] = useState(true);
  const [allowUpdateBranch, setAllowUpdateBranch] = useState(true);
  const [allowAutoMerge, setAllowAutoMerge] = useState(true);

  const [sortColumn, setSortColumn] = useState<SortColumn>("repo");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [rowUpdating, setRowUpdating] = useState<number | null>(null);

  const refreshSummary = useCallback(async () => {
    if (!envReady) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getOrganizationSummary();
      setSummary(response.summary);
      if (response.summary.defaultBranches.length > 0) {
        setDefaultBranchTarget(response.summary.defaultBranches[0].name);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [envReady]);

  useEffect(() => {
    if (!envReady) return;
    refreshSummary();
  }, [envReady, refreshSummary]);

  const repoPolicies = useMemo(() => summary?.governance.repoPolicies ?? [], [summary]);
  const defaultBranchStats = useMemo(() => summary?.defaultBranches ?? [], [summary]);
  const problematicRepos = useMemo(() => summary?.security.problematicRepos ?? [], [summary]);

  const configTarget = configPath && configPath.length > 0 ? configPath : "config/config.json";

  const aggregateStates = useMemo(() => {
    const target = defaultBranchTarget.trim();
    const defaultBranchMatches = repoPolicies.map((policy) => policy.defaultBranch === target);
    const statusChecksValues = repoPolicies.map(
      (policy) => (policy.branchProtection.requiredStatusChecks?.contexts.length ?? 0) > 0
    );
    const requiredReviewsValues = repoPolicies.map(
      (policy) => (policy.branchProtection.requiredApprovingReviewCount ?? 0) > 0
    );
    const codeOwnersValues = repoPolicies.map(
      (policy) => policy.branchProtection.requireCodeOwnerReviews === true
    );
    const enforceChecksValues = repoPolicies.map(
      (policy) => policy.branchProtection.requiredStatusChecks !== null
    );
    const restrictPushValues = repoPolicies.map(
      (policy) => policy.branchProtection.allowsForcePushes === false
    );
    const requireUpToDateValues = repoPolicies.map(
      (policy) => policy.branchProtection.requiredStatusChecks?.strict === true
    );
    const deleteBranchValues = repoPolicies.map((policy) => policy.deleteBranchOnMerge === true);
    const autoMergeValues = repoPolicies.map((policy) => policy.allowAutoMerge === true);
    const updateBranchValues = repoPolicies.map((policy) => policy.allowUpdateBranch === true);

    return {
      defaultBranch: triState(defaultBranchMatches),
      statusChecks: triState(statusChecksValues),
      requiredReviews: triState(requiredReviewsValues),
      codeOwners: triState(codeOwnersValues),
      enforceChecks: triState(enforceChecksValues),
      restrictForcePushes: triState(restrictPushValues),
      requireUpToDate: triState(requireUpToDateValues),
      deleteBranch: triState(deleteBranchValues),
      autoMerge: triState(autoMergeValues),
      updateBranch: triState(updateBranchValues),
    };
  }, [repoPolicies, defaultBranchTarget]);

  const sortedPolicies = useMemo(() => {
    const items = [...repoPolicies];
    const compareBool = (value: boolean | null | undefined) => (value === true ? 2 : value === false ? 1 : 0);

    const comparator = (a: RepoPolicySnapshot, b: RepoPolicySnapshot) => {
      let result = 0;
      switch (sortColumn) {
        case "repo":
          result = a.name.localeCompare(b.name);
          break;
        case "defaultBranch":
          result = a.defaultBranch.localeCompare(b.defaultBranch);
          break;
        case "statusChecks":
          result =
            (a.branchProtection.requiredStatusChecks?.contexts.length ?? 0) -
            (b.branchProtection.requiredStatusChecks?.contexts.length ?? 0);
          break;
        case "requiredReviews":
          result =
            (a.branchProtection.requiredApprovingReviewCount ?? 0) -
            (b.branchProtection.requiredApprovingReviewCount ?? 0);
          break;
        case "codeOwners":
          result = compareBool(a.branchProtection.requireCodeOwnerReviews) -
            compareBool(b.branchProtection.requireCodeOwnerReviews);
          break;
        case "enforceChecks":
          result = compareBool(a.branchProtection.requiredStatusChecks !== null) -
            compareBool(b.branchProtection.requiredStatusChecks !== null);
          break;
        case "restrictForcePushes":
          result = compareBool(a.branchProtection.allowsForcePushes === false) -
            compareBool(b.branchProtection.allowsForcePushes === false);
          break;
        case "requireUpToDate":
          result = compareBool(a.branchProtection.requiredStatusChecks?.strict) -
            compareBool(b.branchProtection.requiredStatusChecks?.strict);
          break;
        case "deleteBranch":
          result = compareBool(a.deleteBranchOnMerge) - compareBool(b.deleteBranchOnMerge);
          break;
        case "autoMerge":
          result = compareBool(a.allowAutoMerge) - compareBool(b.allowAutoMerge);
          break;
        case "updateBranch":
          result = compareBool(a.allowUpdateBranch) - compareBool(b.allowUpdateBranch);
          break;
        default:
          result = 0;
      }

      return sortDirection === "asc" ? result : -result;
    };

    items.sort(comparator);
    return items;
  }, [repoPolicies, sortColumn, sortDirection]);

  const handleApply = async () => {
    if (!summary) return;

    const repoNames = summary.governance.repoPolicies.map((item) => item.fullName);
    const payload: GovernanceActionPayload = {
      targetDefaultBranch: defaultBranchTarget.trim() ? defaultBranchTarget.trim() : undefined,
      branchProtection: {
        approvalsRequired,
        dismissStaleReviews,
        requireCodeOwners,
        strictStatusChecks,
        statusCheckContexts: statusCheckContexts
          .split(",")
          .map((context) => context.trim())
          .filter(Boolean),
        restrictForcePushes,
        requireUpToDate,
      },
      repoSettings: {
        deleteBranchOnMerge,
        allowUpdateBranch,
        allowAutoMerge,
      },
      repos: repoNames,
    };

    setActionState({ working: true, message: null, error: null });
    setRowUpdating(null);

    try {
      const response = await applyGovernanceActions(payload);
      handleGovernanceResponse(response);
    } catch (err) {
      setActionState({
        working: false,
        message: null,
        error: (err as Error).message,
      });
    }
  };

  const handleGovernanceResponse = (response: GovernanceResponse) => {
    const { stats, results, snapshot: updatedSnapshot } = response;
    const successes = stats.successes;
    const failures = stats.failures;

    if (updatedSnapshot) {
      setSummary(updatedSnapshot);
    } else {
      refreshSummary();
    }

    setActionState({
      working: false,
      message: `Applied policies to ${results.length} repos (${successes} succeeded, ${failures} failed).`,
      error: null,
    });

    if (results.length === 1 && results[0].repoId) {
      setRowUpdating(results[0].repoId);
      setTimeout(() => setRowUpdating(null), 2000);
    }
  };

  if (!envReady) {
    return (
      <div className={styles.emptyState}>
        <h2>Configuration required</h2>
        <p>
          Provide the required values via the Settings tab. They will be saved to <code>{configTarget}</code>.
          {missingFields.length > 0 ? (
            <> Missing keys: {missingFields.join(", ")}.</>
          ) : (
            <> Ensure githubToken and githubOrg are configured.</>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1>Governance engine</h1>
            <p>
              Apply branch protection and repository policies across your GitHub organization.
            </p>
          </div>
        </div>
        <div className={styles.summaryBar}>
          <div>
            <strong>{organization ?? "Unknown org"}</strong>
            <span>{summary?.totals.repos ?? 0} repositories</span>
          </div>
          <button type="button" onClick={refreshSummary} disabled={loading}>
            Refresh summary
          </button>
        </div>
      </header>

      {error ? (
        <div className={styles.errorCard}>{error}</div>
      ) : (
        <div className={styles.contentGrid}>
          <section className={styles.actionsPanel}>
            <h2>Policies to apply</h2>
            <div className={styles.formGroup}>
              <label>Target default branch</label>
              <input
                type="text"
                value={defaultBranchTarget}
                onChange={(event) => setDefaultBranchTarget(event.target.value)}
              />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Approvals required</label>
                <input
                  type="number"
                  min={0}
                  value={approvalsRequired}
                  onChange={(event) => setApprovalsRequired(Number.parseInt(event.target.value, 10) || 0)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Require status checks</label>
                <input
                  type="text"
                  value={statusCheckContexts}
                  onChange={(event) => setStatusCheckContexts(event.target.value)}
                  placeholder="build, test"
                />
              </div>
            </div>

            <div className={styles.checkboxRow}>
              <label>
                <input
                  type="checkbox"
                  checked={dismissStaleReviews}
                  onChange={(event) => setDismissStaleReviews(event.target.checked)}
                />
                Dismiss stale reviews
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={requireCodeOwners}
                  onChange={(event) => setRequireCodeOwners(event.target.checked)}
                />
                Require code owner reviews
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={strictStatusChecks}
                  onChange={(event) => setStrictStatusChecks(event.target.checked)}
                />
                Status checks must be up to date
              </label>
            </div>
            <div className={styles.checkboxRow}>
              <label>
                <input
                  type="checkbox"
                  checked={restrictForcePushes}
                  onChange={(event) => setRestrictForcePushes(event.target.checked)}
                />
                Restrict force pushes
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={requireUpToDate}
                  onChange={(event) => setRequireUpToDate(event.target.checked)}
                />
                Require branch to be up to date
              </label>
            </div>

            <hr className={styles.divider} />

            <div className={styles.checkboxRow}>
              <label>
                <input
                  type="checkbox"
                  checked={deleteBranchOnMerge}
                  onChange={(event) => setDeleteBranchOnMerge(event.target.checked)}
                />
                Delete branches on merge
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={allowAutoMerge}
                  onChange={(event) => setAllowAutoMerge(event.target.checked)}
                />
                Allow auto-merge
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={allowUpdateBranch}
                  onChange={(event) => setAllowUpdateBranch(event.target.checked)}
                />
                Allow update branch
              </label>
            </div>

            <button
              type="button"
              className={styles.applyButton}
              onClick={handleApply}
              disabled={actionState.working || loading || repoPolicies.length === 0}
            >
              {actionState.working ? "Applying policies…" : "Apply policies"}
            </button>
            {actionState.error ? (
              <div className={styles.errorText}>{actionState.error}</div>
            ) : actionState.message ? (
              <div className={styles.successText}>{actionState.message}</div>
            ) : null}
          </section>

          <section className={styles.tablePanel}>
            <div className={styles.tableHeader}>
              <div>
                <h2>Repositories ({repoPolicies.length})</h2>
                <p>Current policy configuration for each repository.</p>
              </div>
              <div className={styles.sortControls}>
                <label>
                  Sort by
                  <select
                    value={sortColumn}
                    onChange={(event) => setSortColumn(event.target.value as SortColumn)}
                  >
                    {SORTABLE_COLUMNS.map((column) => (
                      <option value={column} key={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                  }
                >
                  {sortDirection === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>

            <div className={styles.tableScroll}>
              <table className={styles.policyTable}>
                <thead>
                  <tr>
                    <th>Repository</th>
                    <th>Default branch</th>
                    <th>Status checks</th>
                    <th>Approvals</th>
                    <th>Code owners</th>
                    <th>Strict checks</th>
                    <th>Force push</th>
                    <th>Delete branch</th>
                    <th>Auto merge</th>
                    <th>Update branch</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPolicies.map((policy) => (
                    <tr
                      key={policy.id}
                      className={rowUpdating === policy.id ? styles.rowHighlight : undefined}
                    >
                      <td>
                        <div className={styles.repoCell}>
                          <strong>{policy.fullName}</strong>
                          <span className={styles.repoLink}>{policy.htmlUrl}</span>
                        </div>
                      </td>
                      <td>{policy.defaultBranch}</td>
                      <td>{
                        policy.branchProtection.requiredStatusChecks?.contexts.length ?? 0
                      }</td>
                      <td>{policy.branchProtection.requiredApprovingReviewCount ?? 0}</td>
                      <td>{booleanDisplay(policy.branchProtection.requireCodeOwnerReviews)}</td>
                      <td>{booleanDisplay(policy.branchProtection.requiredStatusChecks?.strict)}</td>
                      <td>{booleanDisplay(policy.branchProtection.allowsForcePushes === false)}</td>
                      <td>{booleanDisplay(policy.deleteBranchOnMerge)}</td>
                      <td>{booleanDisplay(policy.allowAutoMerge)}</td>
                      <td>{booleanDisplay(policy.allowUpdateBranch)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className={styles.summaryPanel}>
            <h3>Org snapshot</h3>
            <div className={styles.summaryCard}>
              <span>Default branch breakdown</span>
              <ul>
                {defaultBranchStats.map((branch) => (
                  <li key={branch.name}>
                    <strong>{branch.name}</strong> – {branch.count} repos ({branch.percent}%)
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.summaryCard}>
              <span>Problematic repositories</span>
              {problematicRepos.length === 0 ? (
                <p>No issues detected.</p>
              ) : (
                <ul>
                  {problematicRepos.map((repo) => (
                    <li key={repo.repo}>
                      <strong>{repo.repo}</strong>
                      <ul>
                        {repo.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

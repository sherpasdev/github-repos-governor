import { useCallback, useEffect, useMemo, useRef, useState, type SVGProps } from 'react';

import {
  applyGovernanceActions,
  getOrganizationSummary,
  refreshOrganizationSummary,
  type GovernanceActionPayload,
  type GovernanceResponse,
  type RefreshSummaryResponse,
} from '@/services/api';
import type { RepoSnapshot } from '@/lib/repoSnapshot';
import { EventsOn } from '../../../wailsjs/runtime/runtime';
import styles from './RepositoriesView.module.css';
import { InfoTooltip } from './InfoTooltip';
import { ActionState, RepoRow, RepoSettingField, RepositoriesViewProps } from './types';
import { describeSetting, renderBoolean, renderForcePush, renderLastPush, renderSecurity } from './utils';

const INITIAL_ACTION_STATE: ActionState = {
  working: false,
  message: null,
  error: null,
};

export function RepositoriesView({ envReady, organization, missingFields, configPath, onSelectRepository, onNotify }: RepositoriesViewProps) {
  const [snapshot, setSnapshot] = useState<RepoSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const [isGovernanceOpen, setGovernanceOpen] = useState(false);
  const [activeMutation, setActiveMutation] = useState<{ repoId: number; field: RepoSettingField } | null>(null);
  const [actionState, setActionState] = useState<ActionState>(INITIAL_ACTION_STATE);
  const [defaultBranchTarget, setDefaultBranchTarget] = useState('main');
  const [approvalsRequired, setApprovalsRequired] = useState(1);
  const [dismissStaleReviews, setDismissStaleReviews] = useState(true);
  const [requireCodeOwners, setRequireCodeOwners] = useState(true);
  const [strictStatusChecks, setStrictStatusChecks] = useState(true);
  const [statusCheckContexts, setStatusCheckContexts] = useState('build, test');
  const [restrictForcePushes, setRestrictForcePushes] = useState(true);
  const [requireUpToDate, setRequireUpToDate] = useState(true);
  const [deleteBranchOnMerge, setDeleteBranchOnMerge] = useState(true);
  const [allowUpdateBranch, setAllowUpdateBranch] = useState(true);
  const [allowAutoMerge, setAllowAutoMerge] = useState(true);

  const configTarget = configPath && configPath.length > 0 ? configPath : 'config/config.json';

  const handleRefresh = useCallback(() => {
    if (isRefreshing) {
      return;
    }

    setModalOpen(true);
    setLogEntries([]);
    setRefreshError(null);
    setIsRefreshing(true);
    setLoading(true);

    const off = EventsOn('governor:refresh-log', (message: string) => {
      setLogEntries(prev => [...prev, String(message)]);
    });

    refreshOrganizationSummary()
      .then((response: RefreshSummaryResponse) => {
        setSnapshot(response.summary);
        if (response.logs && response.logs.length > 0) {
          setLogEntries(response.logs);
        }
      })
      .catch((err: Error) => {
        setRefreshError(err.message);
      })
      .finally(() => {
        off();
        setIsRefreshing(false);
        setLoading(false);
      });
  }, [isRefreshing]);

  const handleCloseModal = useCallback(() => {
    if (isRefreshing) {
      return;
    }
    setModalOpen(false);
    setRefreshError(null);
    setLogEntries([]);
  }, [isRefreshing]);

  useEffect(() => {
    if (!envReady) {
      setSnapshot(null);
      return;
    }
    setLoading(true);
    setError(null);

    getOrganizationSummary()
      .then(response => {
        setSnapshot(response.summary);
      })
      .catch((err: Error) => {
        setError(err.message);
        setSnapshot(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [envReady]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logEntries]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    if (snapshot.defaultBranches.length > 0) {
      setDefaultBranchTarget(prev => (prev ? prev : snapshot.defaultBranches[0].name));
    }
  }, [snapshot]);

  const repoPolicies = useMemo(() => snapshot?.governance.repoPolicies ?? [], [snapshot]);

  const rows = useMemo<RepoRow[]>(() => {
    if (repoPolicies.length === 0) {
      return [];
    }

    return repoPolicies
      .map(policy => {
        const branch = policy.branchProtection ?? {
          enabled: false,
          requiredApprovingReviewCount: null,
          requiredStatusChecks: null,
          allowsForcePushes: null,
          dismissStaleReviews: false,
          requireCodeOwnerReviews: false,
        };
        const statusContextCount = branch.requiredStatusChecks?.contexts.length ?? 0;
        const statusChecksLabel = branch.requiredStatusChecks ? `${statusContextCount} ${statusContextCount === 1 ? 'check' : 'checks'}` : 'None';

        return {
          id: policy.id,
          name: policy.name,
          fullName: policy.fullName,
          htmlUrl: policy.htmlUrl,
          defaultBranch: policy.defaultBranch,
          defaultBranchLastPush: policy.defaultBranchPushedAt ?? null,
          advancedSecurity: policy.advancedSecurityEnabled ?? null,
          advancedSecurityStatus: policy.advancedSecurityStatus ?? null,
          dependencyGraph: policy.dependencyGraphEnabled ?? null,
          dependencyGraphStatus: policy.dependencyGraphStatus ?? null,
          branchProtected: branch.enabled,
          approvalsRequired: branch.requiredApprovingReviewCount,
          statusChecks: statusChecksLabel,
          forcePushAllowed: branch.allowsForcePushes,
          deleteBranchOnMerge: policy.deleteBranchOnMerge,
          allowAutoMerge: policy.allowAutoMerge,
          allowUpdateBranch: policy.allowUpdateBranch,
        } satisfies RepoRow;
      })
      .sort((a, b) => {
        const dateA = a.defaultBranchLastPush ? Date.parse(a.defaultBranchLastPush) : 0;
        const dateB = b.defaultBranchLastPush ? Date.parse(b.defaultBranchLastPush) : 0;
        if (dateA !== dateB) {
          return dateB - dateA;
        }
        return a.name.localeCompare(b.name);
      });
  }, [repoPolicies]);

  const governanceStats = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    const total = repoPolicies.length;
    if (total === 0) {
      return {
        total,
        protectedCount: 0,
        restrictForcePushCount: 0,
        deleteBranchCount: 0,
        autoMergeCount: 0,
        updateBranchCount: 0,
      };
    }

    let protectedCount = 0;
    let restrictForcePushCount = 0;
    let deleteBranchCount = 0;
    let autoMergeCount = 0;
    let updateBranchCount = 0;

    for (const policy of repoPolicies) {
      if (policy.branchProtection.enabled) {
        protectedCount += 1;
      }
      if (policy.branchProtection.allowsForcePushes === false) {
        restrictForcePushCount += 1;
      }
      if (policy.deleteBranchOnMerge === true) {
        deleteBranchCount += 1;
      }
      if (policy.allowAutoMerge === true) {
        autoMergeCount += 1;
      }
      if (policy.allowUpdateBranch === true) {
        updateBranchCount += 1;
      }
    }

    return {
      total,
      protectedCount,
      restrictForcePushCount,
      deleteBranchCount,
      autoMergeCount,
      updateBranchCount,
    };
  }, [repoPolicies]);

  const formatCoverage = useCallback((count: number, total: number) => {
    if (total === 0) {
      return '0%';
    }
    const percent = (count / total) * 100;
    return `${percent.toFixed(percent === 100 || percent === 0 ? 0 : 1)}%`;
  }, []);

  const handleRepoSettingToggle = useCallback(
    async (row: RepoRow, field: RepoSettingField, nextValue: boolean) => {
      if (activeMutation) {
        return;
      }

      setActiveMutation({ repoId: row.id, field });

      const repoSettings: NonNullable<GovernanceActionPayload['repoSettings']> = {};
      repoSettings[field] = nextValue;

      try {
        const response: GovernanceResponse = await applyGovernanceActions({
          repoSettings,
          repos: [row.fullName],
        });

        const targetResult = response.results.find(item => {
          if (item.repoId && item.repoId === row.id) {
            return true;
          }
          if (item.repo) {
            return (
              item.repo.localeCompare(row.fullName, undefined, { sensitivity: 'accent' }) === 0 ||
              item.repo.localeCompare(row.name, undefined, { sensitivity: 'accent' }) === 0
            );
          }
          return false;
        });

        if (!targetResult || !targetResult.success) {
          const reason = targetResult?.message ?? 'Unable to update repository setting.';
          onNotify?.({
            type: 'error',
            message: `${row.name}: ${reason}`,
          });
          if (response.snapshot) {
            setSnapshot(response.snapshot);
          }
          return;
        }

        if (response.snapshot) {
          setSnapshot(response.snapshot);
        } else {
          setSnapshot(prev => {
            if (!prev) {
              return prev;
            }
            const policies = prev.governance.repoPolicies.map(policy => {
              if (policy.id !== row.id) {
                return policy;
              }
              const changes = targetResult.changes ?? {};
              switch (field) {
                case 'deleteBranchOnMerge':
                  return {
                    ...policy,
                    deleteBranchOnMerge: changes.deleteBranchOnMerge ?? nextValue,
                  };
                case 'allowAutoMerge':
                  return {
                    ...policy,
                    allowAutoMerge: changes.allowAutoMerge ?? nextValue,
                  };
                case 'allowUpdateBranch':
                  return {
                    ...policy,
                    allowUpdateBranch: changes.allowUpdateBranch ?? nextValue,
                  };
                default:
                  return policy;
              }
            });
            return {
              ...prev,
              governance: {
                ...prev.governance,
                repoPolicies: policies,
              },
            };
          });
        }

        const message = targetResult.message ?? describeSetting(field, nextValue);
        onNotify?.({
          type: 'success',
          message: `${row.name}: ${message}`,
        });
      } catch (err) {
        onNotify?.({
          type: 'error',
          message: (err as Error).message,
        });
      } finally {
        setActiveMutation(null);
      }
    },
    [activeMutation, onNotify]
  );

  const handleInlineGovernanceResponse = useCallback(
    async (response: GovernanceResponse) => {
      const { stats, results, snapshot: updatedSnapshot } = response;
      const successes = stats.successes;
      const failures = stats.failures;

      if (updatedSnapshot) {
        setSnapshot(updatedSnapshot);
      } else {
        try {
          const refreshed = await getOrganizationSummary();
          setSnapshot(refreshed.summary);
        } catch (err) {
          onNotify?.({
            type: 'error',
            message: (err as Error).message,
          });
        }
      }

      const message = `Applied policies to ${results.length} repos (${successes} succeeded, ${failures} failed).`;
      setActionState({
        working: false,
        message,
        error: null,
      });
      onNotify?.({
        type: failures > 0 ? 'error' : 'success',
        message,
      });
    },
    [onNotify]
  );

  const handleInlineApply = useCallback(async () => {
    if (!snapshot) {
      return;
    }
    const repoNames = snapshot.governance.repoPolicies.map(item => item.fullName);
    if (repoNames.length === 0) {
      return;
    }

    const payload: GovernanceActionPayload = {
      targetDefaultBranch: defaultBranchTarget.trim() ? defaultBranchTarget.trim() : undefined,
      branchProtection: {
        approvalsRequired,
        dismissStaleReviews,
        requireCodeOwners,
        strictStatusChecks,
        statusCheckContexts: statusCheckContexts
          .split(',')
          .map(context => context.trim())
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

    setActionState({
      working: true,
      message: null,
      error: null,
    });

    try {
      const response = await applyGovernanceActions(payload);
      await handleInlineGovernanceResponse(response);
    } catch (err) {
      const message = (err as Error).message;
      setActionState({
        working: false,
        message: null,
        error: message,
      });
      onNotify?.({
        type: 'error',
        message,
      });
    }
  }, [
    snapshot,
    defaultBranchTarget,
    approvalsRequired,
    dismissStaleReviews,
    requireCodeOwners,
    strictStatusChecks,
    statusCheckContexts,
    restrictForcePushes,
    requireUpToDate,
    deleteBranchOnMerge,
    allowUpdateBranch,
    allowAutoMerge,
    handleInlineGovernanceResponse,
    onNotify,
  ]);

  if (!envReady) {
    return (
      <div className={styles.emptyState}>
        <h2>Configuration required</h2>
        <p>
          Provide the required values via the Settings tab. They will be saved to <code>{configTarget}</code>.
          {missingFields.length > 0 ? <> Missing keys: {missingFields.join(', ')}.</> : <> Ensure githubToken and githubOrg are set.</>}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorCard}>
        <h2>Unable to load repositories</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {governanceStats ? (
        <div className={styles.governanceWidget}>
          <button type='button' className={styles.governanceToggle} onClick={() => setGovernanceOpen(open => !open)}>
            <div>
              <span className={styles.governanceTitle}>Governance</span>
              <span className={styles.governanceSubtitle}>
                Branch protection {governanceStats.protectedCount}/{governanceStats.total} • Auto merge {governanceStats.autoMergeCount}/
                {governanceStats.total} • Delete branch on merge {governanceStats.deleteBranchCount}/{governanceStats.total} • Allow branch updates{' '}
                {governanceStats.updateBranchCount}/{governanceStats.total}
              </span>
            </div>
            <span className={styles.governanceCaret} aria-hidden>
              {isGovernanceOpen ? '▴' : '▾'}
            </span>
          </button>
          {isGovernanceOpen ? (
            <div className={styles.governancePanel}>
              <div className={styles.governanceStatsGrid}>
                <GovernanceStat
                  label='Branch protection enabled'
                  value={`${governanceStats.protectedCount}/${governanceStats.total}`}
                  coverage={formatCoverage(governanceStats.protectedCount, governanceStats.total)}
                />
                <GovernanceStat
                  label='Force pushes restricted'
                  value={`${governanceStats.restrictForcePushCount}/${governanceStats.total}`}
                  coverage={formatCoverage(governanceStats.restrictForcePushCount, governanceStats.total)}
                />
                <GovernanceStat
                  label='Delete branch on merge'
                  value={`${governanceStats.deleteBranchCount}/${governanceStats.total}`}
                  coverage={formatCoverage(governanceStats.deleteBranchCount, governanceStats.total)}
                />
                <GovernanceStat
                  label='Auto merge enabled'
                  value={`${governanceStats.autoMergeCount}/${governanceStats.total}`}
                  coverage={formatCoverage(governanceStats.autoMergeCount, governanceStats.total)}
                />
                <GovernanceStat
                  label='Allow branch updates'
                  value={`${governanceStats.updateBranchCount}/${governanceStats.total}`}
                  coverage={formatCoverage(governanceStats.updateBranchCount, governanceStats.total)}
                />
              </div>
              <div className={styles.governanceControls}>
                <h3>Policies to apply</h3>
                <div className={styles.governancePrimaryRow}>
                  <div className={styles.governanceFormGroup}>
                    <label htmlFor='inline-default-branch'>Target default branch</label>
                    <input
                      id='inline-default-branch'
                      type='text'
                      value={defaultBranchTarget}
                      onChange={event => setDefaultBranchTarget(event.target.value)}
                    />
                  </div>
                  <div className={styles.governanceFormGroup}>
                    <label htmlFor='inline-approvals'>Approvals required</label>
                    <input
                      id='inline-approvals'
                      type='number'
                      min={0}
                      value={approvalsRequired}
                      onChange={event => setApprovalsRequired(Number.parseInt(event.target.value, 10) || 0)}
                    />
                  </div>
                  <div className={styles.governanceFormGroup}>
                    <label htmlFor='inline-status-checks'>Require status checks</label>
                    <input
                      id='inline-status-checks'
                      type='text'
                      value={statusCheckContexts}
                      onChange={event => setStatusCheckContexts(event.target.value)}
                      placeholder='build, test'
                    />
                  </div>
                </div>
                <div className={styles.governanceCheckboxRow}>
                  <label>
                    <input type='checkbox' checked={dismissStaleReviews} onChange={event => setDismissStaleReviews(event.target.checked)} />
                    Dismiss stale reviews
                  </label>
                  <label>
                    <input type='checkbox' checked={requireCodeOwners} onChange={event => setRequireCodeOwners(event.target.checked)} />
                    Require code owner reviews
                  </label>
                  <label>
                    <input type='checkbox' checked={strictStatusChecks} onChange={event => setStrictStatusChecks(event.target.checked)} />
                    Status checks must be up to date
                  </label>
                </div>
                <div className={styles.governanceCheckboxRow}>
                  <label>
                    <input type='checkbox' checked={restrictForcePushes} onChange={event => setRestrictForcePushes(event.target.checked)} />
                    Restrict force pushes
                  </label>
                  <label>
                    <input type='checkbox' checked={requireUpToDate} onChange={event => setRequireUpToDate(event.target.checked)} />
                    Require branch to be up to date
                  </label>
                </div>
                <hr className={styles.governanceDivider} />
                <div className={styles.governanceCheckboxRow}>
                  <label>
                    <input type='checkbox' checked={deleteBranchOnMerge} onChange={event => setDeleteBranchOnMerge(event.target.checked)} />
                    Delete branches on merge
                  </label>
                  <label>
                    <input type='checkbox' checked={allowAutoMerge} onChange={event => setAllowAutoMerge(event.target.checked)} />
                    Allow auto-merge
                  </label>
                  <label>
                    <input type='checkbox' checked={allowUpdateBranch} onChange={event => setAllowUpdateBranch(event.target.checked)} />
                    Allow update branch
                  </label>
                </div>
                <button
                  type='button'
                  className={styles.governanceApplyButton}
                  onClick={handleInlineApply}
                  disabled={actionState.working || repoPolicies.length === 0}
                >
                  {actionState.working ? 'Applying policies…' : 'Apply policies'}
                </button>
                {actionState.error ? (
                  <div className={styles.governanceErrorText}>{actionState.error}</div>
                ) : actionState.message ? (
                  <div className={styles.governanceSuccessText}>{actionState.message}</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={styles.headerRow}>
        <div>
          <h1>Repositories</h1>
          <p>{loading ? 'Fetching latest repository policies…' : `${rows.length} repositories from ${organization ?? 'unknown organisation'}.`}</p>
          <p className={styles.tableNote}>Last push reflects the most recent commit on the default branch.</p>
        </div>
        <button type='button' className={styles.refreshButton} onClick={handleRefresh} disabled={loading || isRefreshing}>
          Refresh
        </button>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Repository</th>
              <th>Default branch</th>
              <th>Last push</th>
              <th>Protected</th>
              <th>Approvals</th>
              <th>
                <div className={styles.headerLabel}>
                  <span>Required Status Checks</span>
                  <InfoTooltip
                    info='Require status checks to pass before merging pull requests.'
                    docsUrl='https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-merge-methods-you-allow-for-your-pull-requests/requiring-status-checks-before-merging'
                    docsLabel='GitHub docs'
                  />
                </div>
              </th>
              <th>Force push</th>
              <th>
                <div className={styles.headerLabel}>
                  <span>Delete Branch on Merge</span>
                  <InfoTooltip
                    info='Automatically delete head branches after pull requests merge.'
                    docsUrl='https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-the-automatic-deletion-of-branches'
                    docsLabel='GitHub docs'
                  />
                </div>
              </th>
              <th>Auto merge</th>
              <th>
                <div className={styles.headerLabel}>
                  <span>Allow Branch Updates</span>
                  <InfoTooltip
                    info='Enable the Update branch button so pull requests can sync with the base branch.'
                    docsUrl='https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/updating-a-pull-request-branch'
                    docsLabel='GitHub docs'
                  />
                </div>
              </th>
              <th>CodeQL</th>
              <th>Dependency graph</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className={styles.loadingRow}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.loadingRow}>
                  No repositories available.
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id}>
                  <td>
                    <div className={styles.repoCell}>
                      <div className={styles.repoHeader}>
                        <a
                          href={row.htmlUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className={styles.repoExternalLink}
                          aria-label={`Open ${row.fullName} on GitHub`}
                          title={row.fullName}
                        >
                          <GitHubIcon />
                        </a>
                        <button type='button' className={styles.repoNameButton} onClick={() => onSelectRepository(row.name)}>
                          {row.name}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td>{row.defaultBranch}</td>
                  <td>{renderLastPush(row.defaultBranchLastPush)}</td>
                  <td>{renderBoolean(row.branchProtected)}</td>
                  <td>{row.approvalsRequired ?? '—'}</td>
                  <td>{row.statusChecks}</td>
                  <td>{renderForcePush(row.forcePushAllowed)}</td>
                  <td>
                    <RepoSettingToggle
                      value={row.deleteBranchOnMerge}
                      onToggle={next => handleRepoSettingToggle(row, 'deleteBranchOnMerge', next)}
                      disabled={
                        loading || Boolean(activeMutation && !(activeMutation.repoId === row.id && activeMutation.field === 'deleteBranchOnMerge'))
                      }
                      loading={activeMutation?.repoId === row.id && activeMutation.field === 'deleteBranchOnMerge'}
                      ariaLabel={`Toggle delete branch on merge for ${row.name}`}
                    />
                  </td>
                  <td>
                    <RepoSettingToggle
                      value={row.allowAutoMerge}
                      onToggle={next => handleRepoSettingToggle(row, 'allowAutoMerge', next)}
                      disabled={
                        loading || Boolean(activeMutation && !(activeMutation.repoId === row.id && activeMutation.field === 'allowAutoMerge'))
                      }
                      loading={activeMutation?.repoId === row.id && activeMutation.field === 'allowAutoMerge'}
                      ariaLabel={`Toggle auto merge for ${row.name}`}
                    />
                  </td>
                  <td>
                    <RepoSettingToggle
                      value={row.allowUpdateBranch}
                      onToggle={next => handleRepoSettingToggle(row, 'allowUpdateBranch', next)}
                      disabled={
                        loading || Boolean(activeMutation && !(activeMutation.repoId === row.id && activeMutation.field === 'allowUpdateBranch'))
                      }
                      loading={activeMutation?.repoId === row.id && activeMutation.field === 'allowUpdateBranch'}
                      ariaLabel={`Toggle allow branch updates for ${row.name}`}
                    />
                  </td>
                  <td>{renderSecurity(row.advancedSecurity, row.advancedSecurityStatus ?? undefined)}</td>
                  <td>{renderSecurity(row.dependencyGraph, row.dependencyGraphStatus ?? undefined)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Refreshing organization snapshot</h3>
            </div>
            <div className={styles.logArea}>
              {logEntries.map((line, index) => (
                <div key={`${index}-${line}`}>{line}</div>
              ))}
              <div ref={logEndRef} />
            </div>
            {refreshError ? <div className={styles.errorText}>{refreshError}</div> : null}
            <div className={styles.modalFooter}>
              <button type='button' className={styles.closeButton} onClick={handleCloseModal} disabled={isRefreshing}>
                {isRefreshing ? 'Refreshing…' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type GovernanceStatProps = {
  label: string;
  value: string;
  coverage: string;
};

function GovernanceStat({ label, value, coverage }: GovernanceStatProps) {
  return (
    <div className={styles.governanceStat}>
      <span className={styles.governanceStatLabel}>{label}</span>
      <strong className={styles.governanceStatValue}>{value}</strong>
      <span className={styles.governanceStatCoverage}>{coverage}</span>
    </div>
  );
}

type RepoSettingToggleProps = {
  value: boolean | null;
  onToggle: (nextValue: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel: string;
};

function RepoSettingToggle({ value, onToggle, disabled, loading, ariaLabel }: RepoSettingToggleProps) {
  if (value === null) {
    return <span className={styles.booleanUnknown}>Unknown</span>;
  }

  const active = value === true;
  const className = active ? `${styles.toggleButton} ${styles.toggleOn}` : `${styles.toggleButton} ${styles.toggleOff}`;

  return (
    <button
      type='button'
      className={className}
      onClick={() => onToggle(!active)}
      disabled={disabled || loading}
      aria-pressed={active}
      aria-label={ariaLabel}
    >
      <span className={styles.toggleTrack}>
        <span className={styles.toggleThumb} data-state={active ? 'on' : 'off'} />
      </span>
      <span className={styles.toggleText}>{loading ? '…' : active ? 'Yes' : 'No'}</span>
    </button>
  );
}

type GitHubIconProps = SVGProps<SVGSVGElement>;

function GitHubIcon({ className, ...rest }: GitHubIconProps) {
  return (
    <svg viewBox='0 0 16 16' fill='currentColor' aria-hidden='true' className={className} {...rest}>
      <path d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.01.08-2.11 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.91.08 2.11.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.94-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8Z' />
    </svg>
  );
}

'use client';

import { useEffect, useState } from 'react';

import { formatRelativeTime } from '@/lib/formatters';
import type { RepoSnapshot } from '@/lib/repoSnapshot';
import styles from './DashboardOverview.module.css';

const PIE_COLORS = ['#2563eb', '#10b981', '#f97316', '#ec4899', '#14b8a6', '#facc15', '#a855f7', '#f87171'];

type DashboardOverviewProps = {
  organization: string | null;
  snapshot: RepoSnapshot | null;
  loading: boolean;
  error: string | null;
};

function renderTotals(snapshot: RepoSnapshot) {
  const { totals } = snapshot;
  const staleTrendClass = totals.staleCount30d > 0 ? styles.trendNegative : styles.trend;

  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>Repositories</span>
        <span className={styles.statValue}>{totals.repos}</span>
        <span className={styles.trend}>Live data from GitHub</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>Private</span>
        <span className={styles.statValue}>{totals.privateCount}</span>
        <span className={styles.trend}>{totals.repos > 0 ? `${Math.round((totals.privateCount / totals.repos) * 100)}% of org` : '—'}</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>Archived</span>
        <span className={styles.statValue}>{totals.archivedCount}</span>
        <span className={styles.trend}>{totals.archivedCount === 0 ? 'All active' : 'Review cleanup'}</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>Stale (&gt;30d)</span>
        <span className={styles.statValue}>{totals.staleCount30d}</span>
        <span className={staleTrendClass}>{totals.staleCount30d === 0 ? 'Great job keeping repos active' : 'Consider nudging maintainers'}</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>Contributors</span>
        <span className={styles.statValue}>{snapshot.contributors.total || '—'}</span>
        <span className={styles.trend}>Org members with repo access</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>Last update</span>
        <span className={styles.statValue}>{totals.latestUpdate ? formatRelativeTime(totals.latestUpdate) : '—'}</span>
        <span className={styles.trend}>{totals.latestPush ? `Last push ${formatRelativeTime(totals.latestPush)}` : 'No pushes recorded'}</span>
      </div>
    </div>
  );
}

function renderLanguages(snapshot: RepoSnapshot, charts: typeof import('recharts')) {
  const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } = charts;
  if (snapshot.languages.length === 0) {
    return <div className={styles.emptyState}>No language metadata available yet.</div>;
  }

  const pieData = snapshot.languages.map(language => ({
    name: language.name,
    value: language.percent,
    count: language.count,
  }));

  return (
    <div className={styles.chartRow}>
      <div className={styles.chartCard}>
        <ResponsiveContainer width='100%' height={260}>
          <PieChart>
            <Pie data={pieData} dataKey='value' nameKey='name' innerRadius={60} outerRadius={100} paddingAngle={3}>
              {pieData.map((entry, index) => (
                <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any, name: any, props: any) => [`${value}%`, `${name} • ${props?.payload?.count ?? 0} repos`]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.languageList}>
        {snapshot.languages.map((language, index) => (
          <div key={language.name} className={styles.languageItem}>
            <span className={styles.languageBadge} style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
            <span className={styles.languageLabel}>{language.name}</span>
            <span className={styles.languageValue}>
              {language.count} repo{language.count === 1 ? '' : 's'} • {language.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderContributions(snapshot: RepoSnapshot, charts: typeof import('recharts')) {
  const { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } = charts;
  if (snapshot.contributions.weeks.length === 0) {
    return <div className={styles.emptyState}>No contribution data available yet. GitHub may still be generating stats.</div>;
  }

  const repoSeries = snapshot.contributions.byRepo.slice(0, 5);
  const contributorSeries = snapshot.contributions.byContributor.slice(0, 8);

  return (
    <div className={styles.timelineGrid}>
      <div className={styles.chartCard}>
        <h3>Total commits (last 90 days)</h3>
        <ResponsiveContainer width='100%' height={260}>
          <AreaChart data={snapshot.contributions.weeks}>
            <defs>
              <linearGradient id='colorCommits' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='#2563eb' stopOpacity={0.8} />
                <stop offset='95%' stopColor='#2563eb' stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' stroke='rgba(148,163,184,0.3)' />
            <XAxis dataKey='weekStart' tickFormatter={value => value.slice(5)} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Area type='monotone' dataKey='totalCommits' stroke='#2563eb' fill='url(#colorCommits)' strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.chartCard}>
        <h3>Top repos by commits</h3>
        <ResponsiveContainer width='100%' height={260}>
          <BarChart
            data={repoSeries.map(repo => ({
              name: repo.repo,
              commits: repo.data.reduce((sum, item) => sum + item.commits, 0),
            }))}
          >
            <CartesianGrid strokeDasharray='3 3' stroke='rgba(148,163,184,0.3)' />
            <XAxis dataKey='name' tickFormatter={value => value.split('/').pop() ?? value} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey='commits' fill='#10b981' radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.chartCard}>
        <h3>Top contributors</h3>
        <ResponsiveContainer width='100%' height={260}>
          <BarChart data={contributorSeries}>
            <CartesianGrid strokeDasharray='3 3' stroke='rgba(148,163,184,0.3)' />
            <XAxis dataKey='login' />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey='totalCommits' fill='#f97316' radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function renderSecurity(snapshot: RepoSnapshot) {
  const security = snapshot.security;

  const metrics = [
    {
      label: 'Dependabot',
      value: security.dependabotEnabledPct,
      description: 'Repositories with Dependabot security updates enabled.',
    },
    {
      label: 'CodeQL',
      value: security.codeqlEnabledPct,
      description: 'Repositories with CodeQL security scanning enabled.',
    },
    {
      label: 'Branch protection',
      value: security.branchProtectionPct,
      description: 'Default branches with protection rules.',
    },
    {
      label: 'PR workflows',
      value: security.prWorkflowPct,
      description: 'Repositories where PRs trigger an automation workflow.',
    },
  ];

  return (
    <div className={styles.securityGrid}>
      {metrics.map(metric => (
        <div key={metric.label} className={styles.securityCard}>
          <span className={styles.securityLabel}>{metric.label}</span>
          <span className={styles.securityValue}>{metric.value !== null ? `${metric.value}%` : '—'}</span>
          <p>{metric.description}</p>
        </div>
      ))}
    </div>
  );
}

function renderProblematicRepos(snapshot: RepoSnapshot) {
  if (snapshot.security.problematicRepos.length === 0) {
    return <div className={styles.emptyState}>No problematic repositories detected at the moment.</div>;
  }

  return (
    <div className={styles.problematicList}>
      {snapshot.security.problematicRepos.map(repo => (
        <div key={repo.repo} className={styles.problematicItem}>
          <div>
            <strong>{repo.repo}</strong>
            <ul>
              {repo.reasons.map(reason => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <a href={repo.htmlUrl} target='_blank' rel='noopener noreferrer'>
            View repo ↗
          </a>
        </div>
      ))}
    </div>
  );
}

function renderSkeleton() {
  return (
    <div className={styles.skeletonRow}>
      <div className={styles.skeletonBlock} />
      <div className={styles.skeletonBlock} />
      <div className={styles.skeletonBlock} />
      <div className={styles.skeletonBlock} />
    </div>
  );
}

export function DashboardOverview({ organization, snapshot, loading, error }: DashboardOverviewProps) {
  const [recharts, setRecharts] = useState<typeof import('recharts') | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('recharts')
      .then(mod => {
        if (!cancelled) {
          setRecharts(mod);
        }
      })
      .catch(err => {
        console.error('Failed to load Recharts', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.overview}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{organization ? `${organization} overview` : 'Organization overview'}</h2>
          <span className={styles.sectionCaption}>High-level summary across your GitHub organization.</span>
        </div>
        {loading ? (
          renderSkeleton()
        ) : error ? (
          <div className={styles.emptyState}>{error}</div>
        ) : snapshot ? (
          renderTotals(snapshot)
        ) : (
          <div className={styles.emptyState}>Repositories will appear here once loaded.</div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Language mix</h2>
          <span className={styles.sectionCaption}>Distribution of primary languages across repositories.</span>
        </div>
        {loading || (!recharts && snapshot) ? renderSkeleton() : snapshot && recharts ? renderLanguages(snapshot, recharts) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Contributions</h2>
          <span className={styles.sectionCaption}>Commits and top contributors over the past 90 days.</span>
        </div>
        {loading || (!recharts && snapshot) ? renderSkeleton() : snapshot && recharts ? renderContributions(snapshot, recharts) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Security posture</h2>
          <span className={styles.sectionCaption}>Adoption of Dependabot, CodeQL, branch protection, and PR workflows.</span>
        </div>
        {loading ? renderSkeleton() : snapshot ? renderSecurity(snapshot) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Problematic repositories</h2>
          <span className={styles.sectionCaption}>Top repositories requiring attention based on current policies.</span>
        </div>
        {loading ? renderSkeleton() : snapshot ? renderProblematicRepos(snapshot) : null}
      </section>
    </div>
  );
}

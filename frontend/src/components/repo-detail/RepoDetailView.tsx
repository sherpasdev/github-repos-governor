import { formatDateTime, formatRelativeTime } from "@/lib/formatters";
import type { RateLimitInfo, RepoDetail } from "@/lib/github/types";
import styles from "./RepoDetailView.module.css";

type RepoDetailViewProps = {
  repo: RepoDetail;
  organization: string | null;
  rateLimit: RateLimitInfo;
  onBack: () => void;
};

function formatPercentage(remaining: number | null, limit: number | null): string | null {
  if (remaining === null || limit === null || limit === 0) {
    return null;
  }
  return `${Math.round((remaining / limit) * 100)}%`;
}

export function RepoDetailView({ repo, organization, rateLimit, onBack }: RepoDetailViewProps) {
  const repoPath = organization ? `${organization}/${repo.name}` : repo.fullName;
  const rateLimitPercent = formatPercentage(rateLimit.remaining ?? null, rateLimit.limit ?? null);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backLink} onClick={onBack}>
          ← Back to overview
        </button>

        <div className={styles.titleRow}>
          <h1>{repo.name}</h1>
          <span
            className={`${styles.badge} ${repo.private ? styles.badgePrivate : ""}`}
          >
            {repo.visibility}
          </span>
          {repo.archived ? (
            <span className={`${styles.badge} ${styles.badgeArchived}`}>
              Archived
            </span>
          ) : null}
        </div>

        <p className={styles.subtitle}>
          {repoPath} • Default branch <strong>{repo.defaultBranch}</strong>
        </p>

        <div className={styles.headerActions}>
          <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer">
            View on GitHub ↗
          </a>
          {repo.homepage ? (
            <a
              href={repo.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryLink}
            >
              Visit site ↗
            </a>
          ) : null}
        </div>
      </div>

      <section className={styles.content}>
        <div className={styles.mainColumn}>
          <article className={styles.panel}>
            <h2>Repository description</h2>
            {repo.description ? (
              <p>{repo.description}</p>
            ) : (
              <p className={styles.descriptionEmpty}>
                No description provided yet.
              </p>
            )}
            {repo.topics.length > 0 ? (
              <div className={styles.topics}>
                {repo.topics.map((topic) => (
                  <span key={topic} className={styles.topicBadge}>
                    {topic}
                  </span>
                ))}
              </div>
            ) : null}
          </article>

          <article className={styles.panel}>
            <h2>Key stats</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Stars</span>
                <span className={styles.statValue}>{repo.stars}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Watchers</span>
                <span className={styles.statValue}>{repo.watchers}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Forks</span>
                <span className={styles.statValue}>{repo.forks}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Open issues</span>
                <span className={styles.statValue}>{repo.issues}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Size</span>
                <span className={styles.statValue}>
                  {(repo.size / 1024).toFixed(1)} MB
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>License</span>
                <span className={styles.statValue}>
                  {repo.license ?? "—"}
                </span>
              </div>
            </div>
          </article>

          <article className={styles.panel}>
            <h2>Activity</h2>
            <div className={styles.activityList}>
              <div className={styles.activityItem}>
                <strong>Pushed</strong>
                <span>{formatRelativeTime(repo.pushedAt)}</span>
                <span>{formatDateTime(repo.pushedAt)}</span>
              </div>
              <div className={styles.activityItem}>
                <strong>Updated</strong>
                <span>{formatRelativeTime(repo.updatedAt)}</span>
                <span>{formatDateTime(repo.updatedAt)}</span>
              </div>
              <div className={styles.activityItem}>
                <strong>Created</strong>
                <span>{formatRelativeTime(repo.createdAt)}</span>
                <span>{formatDateTime(repo.createdAt)}</span>
              </div>
            </div>
          </article>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h3>Repository health</h3>
            <div className={styles.metaList}>
              <div className={styles.metaItem}>
                <span>Visibility</span>
                <span>{repo.visibility}</span>
              </div>
              <div className={styles.metaItem}>
                <span>Disabled</span>
                <span>{repo.disabled ? "Yes" : "No"}</span>
              </div>
              <div className={styles.metaItem}>
                <span>Archived</span>
                <span>{repo.archived ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>

          <div className={styles.sidebarCard}>
            <h3>API usage</h3>
            <div className={styles.rateLimit}>
              Remaining: {rateLimit.remaining ?? "?"} / {rateLimit.limit ?? "?"}
              {rateLimitPercent ? ` (${rateLimitPercent})` : ""}{" "}
              {rateLimit.reset
                ? `• Resets ${formatRelativeTime(
                    new Date(rateLimit.reset * 1000).toISOString()
                  )}`
                : ""}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

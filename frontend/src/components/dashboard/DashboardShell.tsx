import { useEffect, useMemo, useState } from "react";

import type { RepoSnapshot } from "@/lib/repoSnapshot";
import { getOrganizationSummary } from "@/services/api";
import { DashboardOverview } from "./DashboardOverview";
import styles from "./DashboardShell.module.css";

type DashboardShellProps = {
  envReady: boolean;
  organization: string | null;
  missingFields: string[];
  configPath?: string | null;
};

export function DashboardShell({
  envReady,
  organization,
  missingFields,
  configPath,
}: DashboardShellProps) {
  const [orgSnapshot, setOrgSnapshot] = useState<RepoSnapshot | null>(null);
  const [orgSnapshotLoading, setOrgSnapshotLoading] = useState(false);
  const [orgSnapshotError, setOrgSnapshotError] = useState<string | null>(null);

  const orgLabel = useMemo(
    () => organization ?? "unknown-org",
    [organization]
  );

  useEffect(() => {
    if (!envReady) {
      setOrgSnapshot(null);
      return;
    }

    let cancelled = false;
    setOrgSnapshotLoading(true);
    setOrgSnapshotError(null);

    getOrganizationSummary()
      .then((payload) => {
        if (!cancelled) {
          setOrgSnapshot(payload.summary);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setOrgSnapshot(null);
          setOrgSnapshotError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOrgSnapshotLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [envReady]);

  const overviewSnapshot = orgSnapshot;
  const overviewLoading = orgSnapshotLoading;
  const overviewError = orgSnapshotError;

  const configTarget = configPath && configPath.length > 0 ? configPath : "config/config.json";

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerNav}>
          <div className={styles.statusDotRow}>
            <h1 className={styles.title}>GitHub Repos Governor</h1>
            <span
              className={styles.statusDot}
              title={
                envReady
                  ? `Connected to ${orgLabel}`
                  : missingFields.length > 0
                  ? `Missing configuration fields: ${missingFields.join(", ")}`
                  : "Configuration incomplete"
              }
            />
          </div>
        </div>
      </header>

      <section className={styles.panel}>
        {envReady ? (
          <DashboardOverview
            organization={organization}
            snapshot={overviewSnapshot}
            loading={overviewLoading}
            error={overviewError}
          />
        ) : (
          <div className={styles.overviewPlaceholder}>
            <div className={styles.panelEmpty}>
              <strong>Configuration required.</strong>
              <span>
                Provide the required values in <code>{configTarget}</code> and restart the app.
                {missingFields.length > 0 ? (
                  <> Missing keys: {missingFields.join(", ")}.</>
                ) : (
                  <> Ensure githubToken and githubOrg are set.</>
                )}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

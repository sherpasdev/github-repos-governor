import { useCallback, useEffect, useState } from "react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RepoDetailView } from "@/components/repo-detail/RepoDetailView";
import { RepositoriesView } from "@/components/repositories/RepositoriesView";
import { SettingsView } from "@/components/settings/SettingsView";
import type { RepoDetailResponse } from "@/services/api";
import { fetchEnvironmentStatus, getRepositoryDetail } from "@/services/api";
import styles from "./App.module.css";

type View = "dashboard" | "repositories" | "repo-detail" | "settings";

type EnvironmentState = {
  ready: boolean;
  missing: string[];
  organization: string | null;
  apiBaseUrl: string;
  configPath: string | null;
  loadError: string | null;
  version: string;
};

export default function App() {
  const [env, setEnv] = useState<EnvironmentState | null>(null);
  const [envError, setEnvError] = useState<string | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [detail, setDetail] = useState<RepoDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchEnvironmentStatus()
      .then((status) => {
        setEnv(status);
        setEnvError(status.loadError ?? null);
      })
      .catch((error: Error) => {
        setEnvError(error.message);
      });
  }, []);

  const handleSelectRepository = (repoName: string) => {
    setView("repo-detail");
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);

    getRepositoryDetail(repoName)
      .then((response) => {
        setDetail(response);
      })
      .catch((error: Error) => {
        setDetailError(error.message);
      })
      .finally(() => {
        setDetailLoading(false);
      });
  };

  const handleNotify = useCallback((next: { type: "success" | "error"; message: string } | null) => {
    setNotification(next);
  }, []);

  useEffect(() => {
    if (!notification || typeof window === "undefined") {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      setNotification(null);
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [notification]);

  const handleSettingsSaved = useCallback(() => {
    fetchEnvironmentStatus()
      .then((status) => {
        setEnv(status);
        setEnvError(status.loadError ?? null);
      })
      .catch((error: Error) => {
        setEnvError(error.message);
      });
  }, []);

  const renderContent = () => {
    if (!env) {
      return (
        <div className={styles.centerPane}>
          <div className={styles.loading}>Bootstrapping application…</div>
        </div>
      );
    }

    if (view === "repo-detail") {
      if (detailLoading) {
        return (
          <div className={styles.centerPane}>
            <div className={styles.loading}>Loading repository details…</div>
          </div>
        );
      }

      if (detailError || !detail) {
        return (
          <div className={styles.centerPane}>
            <div className={styles.errorCard}>
              <h1>Unable to load repository</h1>
              <p>{detailError ?? "Repository data is unavailable."}</p>
              <button type="button" onClick={() => setView("repositories")}>Return to repositories</button>
            </div>
          </div>
        );
      }

      return (
        <RepoDetailView
          repo={detail.repository}
          organization={detail.organization}
          rateLimit={detail.rateLimit}
          onBack={() => setView("repositories")}
        />
      );
    }

    switch (view) {
      case "repositories":
        return (
          <RepositoriesView
            envReady={env.ready}
            organization={env.organization}
            configPath={env.configPath}
            missingFields={env.missing}
            onSelectRepository={handleSelectRepository}
            onNotify={handleNotify}
          />
        );
      case "settings":
        return <SettingsView onNotify={handleNotify} onSaved={handleSettingsSaved} />;
      case "dashboard":
      default:
        return (
          <DashboardShell
            envReady={env.ready}
            organization={env.organization}
            missingFields={env.missing}
            configPath={env.configPath}
          />
        );
    }
  };

  const activeTab: View = view === "repo-detail" ? "repositories" : view;

  const versionLabel = (() => {
    const rawVersion = env?.version?.trim();
    if (!rawVersion) {
      return "dev build";
    }
    return rawVersion === "dev" ? "dev build" : `v${rawVersion}`;
  })();

  return (
    <div className={styles.appShell}>
      <header className={styles.topNav}>
        <div className={styles.brand}>
          <span className={styles.brandName}>GitHub Repos Governor</span>
          <span className={styles.brandVersion}>{versionLabel}</span>
        </div>
        <div className={styles.navNotification} role="status" aria-live="polite">
          {notification ? (
            <span
              className={
                notification.type === "error" ? styles.navNotificationError : styles.navNotificationSuccess
              }
            >
              {notification.message}
            </span>
          ) : null}
        </div>
        <nav className={styles.navLinks}>
          <button
            type="button"
            className={activeTab === "dashboard" ? styles.activeLink : styles.link}
            onClick={() => setView("dashboard")}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activeTab === "repositories" ? styles.activeLink : styles.link}
            onClick={() => setView("repositories")}
          >
            Repositories
          </button>
          <button
            type="button"
            className={activeTab === "settings" ? styles.activeLink : styles.link}
            onClick={() => setView("settings")}
          >
            Settings
          </button>
        </nav>
      </header>

      {envError ? (
        <div className={styles.centerPane}>
          <div className={styles.errorCard}>
            <h1>Unable to load environment</h1>
            <p>{envError}</p>
            {env?.configPath ? (
              <p>
                Expected configuration at <code>{env.configPath}</code>.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <main className={styles.mainContent}>{renderContent()}</main>
      )}
    </div>
  );
}

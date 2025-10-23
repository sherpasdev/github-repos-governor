import { useEffect, useMemo, useState } from 'react';

import { getSettings, saveSettings, type SettingsData } from '@/services/api';
import styles from './SettingsView.module.css';

type SettingsViewProps = {
  onNotify: (notification: { type: 'success' | 'error'; message: string } | null) => void;
  onSaved: () => void;
  missingKeys: string[];
};

type FormState = Omit<SettingsData, 'configPath'>;

export function SettingsView({ onNotify, onSaved, missingKeys }: SettingsViewProps) {
  const [initialSettings, setInitialSettings] = useState<SettingsData | null>(null);
  const [form, setForm] = useState<FormState>({
    githubToken: '',
    githubOrg: '',
    githubApiBaseUrl: 'https://api.github.com',
    disableCache: false,
    cacheDir: '',
    ignoreArchived: true,
  });
  const [configPath, setConfigPath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    getSettings()
      .then(settings => {
        if (!mounted) {
          return;
        }
        setInitialSettings(settings);
        setForm({
          githubToken: settings.githubToken ?? '',
          githubOrg: settings.githubOrg ?? '',
          githubApiBaseUrl: settings.githubApiBaseUrl ?? 'https://api.github.com',
          disableCache: Boolean(settings.disableCache),
          cacheDir: settings.cacheDir ?? '',
          ignoreArchived: settings.ignoreArchived ?? true,
        });
        setConfigPath(settings.configPath ?? '');
        setHighlighted([]);
      })
      .catch((err: Error) => {
        if (!mounted) {
          return;
        }
        setError(err.message);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setHighlighted(missingKeys ?? []);
  }, [missingKeys]);

  const dirty = useMemo(() => {
    if (!initialSettings) {
      return false;
    }
    return (
      form.githubToken !== (initialSettings.githubToken ?? '') ||
      form.githubOrg !== (initialSettings.githubOrg ?? '') ||
      form.githubApiBaseUrl !== (initialSettings.githubApiBaseUrl ?? 'https://api.github.com') ||
      form.disableCache !== initialSettings.disableCache ||
      form.cacheDir !== (initialSettings.cacheDir ?? '') ||
      form.ignoreArchived !== initialSettings.ignoreArchived
    );
  }, [form, initialSettings]);

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }));
    setHighlighted(prev => prev.filter(item => item !== key));
  };

  const handleReset = () => {
    if (!initialSettings) {
      return;
    }
    setForm({
      githubToken: initialSettings.githubToken ?? '',
      githubOrg: initialSettings.githubOrg ?? '',
      githubApiBaseUrl: initialSettings.githubApiBaseUrl ?? 'https://api.github.com',
      disableCache: initialSettings.disableCache,
      cacheDir: initialSettings.cacheDir ?? '',
      ignoreArchived: initialSettings.ignoreArchived,
    });
    setHighlighted(missingKeys ?? []);
  };

  const handleSubmit = async () => {
    if (!initialSettings) {
      return;
    }
    const trimmedToken = form.githubToken.trim();
    const trimmedOrg = form.githubOrg.trim();
    const missingRequired: string[] = [];
    if (!trimmedToken) missingRequired.push('githubToken');
    if (!trimmedOrg) missingRequired.push('githubOrg');
    if (missingRequired.length > 0) {
      const message = 'GitHub token and organization are required.';
      setError(message);
      setHighlighted(missingRequired);
      onNotify({
        type: 'error',
        message,
      });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveSettings({
        ...form,
        githubToken: trimmedToken,
        githubOrg: trimmedOrg,
        configPath,
      });
      onNotify({
        type: 'success',
        message: 'Settings updated successfully.',
      });
      setInitialSettings({
        ...form,
        githubToken: trimmedToken,
        githubOrg: trimmedOrg,
        configPath,
      });
      setForm(prev => ({
        ...prev,
        githubToken: trimmedToken,
        githubOrg: trimmedOrg,
      }));
      setHighlighted([]);
      onSaved();
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      onNotify({
        type: 'error',
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1>Settings</h1>
            <p>Loading configuration…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !initialSettings) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1>Settings unavailable</h1>
            <p>Unable to load configuration values.</p>
          </div>
          <div className={styles.errorBanner}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Application settings</h1>
          <p>Update the configuration file used by GitHub Repos Governor.</p>
        </div>

        {error ? <div className={styles.errorBanner}>{error}</div> : null}

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor='settings-token' className={highlighted.includes('githubToken') ? styles.fieldErrorLabel : undefined}>
              GitHub personal access token
            </label>
            <input
              id='settings-token'
              type='password'
              autoComplete='off'
              value={form.githubToken}
              onChange={event => handleChange('githubToken', event.target.value)}
              placeholder='ghp_xxx'
              className={highlighted.includes('githubToken') ? styles.fieldErrorInput : undefined}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor='settings-org' className={highlighted.includes('githubOrg') ? styles.fieldErrorLabel : undefined}>
              Organization
            </label>
            <input
              id='settings-org'
              type='text'
              value={form.githubOrg}
              onChange={event => handleChange('githubOrg', event.target.value)}
              placeholder='my-org'
              className={highlighted.includes('githubOrg') ? styles.fieldErrorInput : undefined}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor='settings-api'>GitHub API base URL</label>
            <input
              id='settings-api'
              type='text'
              value={form.githubApiBaseUrl}
              onChange={event => handleChange('githubApiBaseUrl', event.target.value)}
              placeholder='https://api.github.com'
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor='settings-cache-dir'>Cache directory</label>
            <input
              id='settings-cache-dir'
              type='text'
              value={form.cacheDir}
              onChange={event => handleChange('cacheDir', event.target.value)}
              placeholder='.cache'
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor='settings-config-path'>Config file</label>
            <input id='settings-config-path' type='text' value={configPath} disabled />
          </div>
        </div>

        <div className={styles.checkboxRow}>
          <label>
            <input type='checkbox' checked={form.disableCache} onChange={event => handleChange('disableCache', event.target.checked)} />
            Disable summary cache
          </label>
          <label>
            <input type='checkbox' checked={form.ignoreArchived} onChange={event => handleChange('ignoreArchived', event.target.checked)} />
            Ignore archived repositories
          </label>
        </div>

        <div className={styles.actions}>
          <button type='button' className={styles.secondaryButton} onClick={handleReset} disabled={!dirty || saving}>
            Reset
          </button>
          <button type='button' className={styles.primaryButton} onClick={handleSubmit} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        <div className={styles.infoFooter}>
          Changes are written directly to the configuration file. Some updates may require refreshing cached data via the Repositories page.
        </div>
      </div>
    </div>
  );
}

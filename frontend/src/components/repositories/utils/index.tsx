import styles from '../RepositoriesView.module.css';
import { RepoSettingField } from '../types';

function mapDetail(detail: string) {
  const cleaned = detail.toLowerCase();
  switch (cleaned) {
    case '':
      return undefined;
    case 'on':
      return 'Default setup';
    case 'managed':
      return 'Managed';
    case 'managed default':
      return 'Managed default';
    case 'by org policy':
      return 'By org policy';
    case 'by enterprise policy':
      return 'By enterprise policy';
    default:
      return cleaned.replace(/\b\w/g, match => match.toUpperCase());
  }
}

function determineSecurityClass(isEnabled: boolean | null, label?: string) {
  if (isEnabled === true || label?.toLowerCase().startsWith('enabled')) {
    return styles.securityStatusPositive;
  }
  if (isEnabled === false || label?.toLowerCase().startsWith('disabled')) {
    return styles.securityStatusNegative;
  }
  return styles.securityStatusNeutral;
}

function parseStatus(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const lower = trimmed.toLowerCase();
  const baseDetail = (value: string) => value.replace(/[_-]/g, ' ').trim();
  const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

  if (lower.startsWith('enabled')) {
    const suffix = baseDetail(lower.replace(/^enabled[_-]?/, ''));
    const detail = mapDetail(suffix);
    return {
      label: 'Enabled',
      detail,
    };
  }

  if (lower.startsWith('disabled')) {
    const suffix = baseDetail(lower.replace(/^disabled[_-]?/, ''));
    const detail = mapDetail(suffix);
    return {
      label: 'Disabled',
      detail,
    };
  }

  if (lower.startsWith('not_available')) {
    return { label: 'Not available' };
  }

  if (lower.startsWith('not_supported') || lower.startsWith('unsupported')) {
    return { label: 'Not supported' };
  }

  if (lower.startsWith('required')) {
    return { label: 'Required' };
  }

  return { label: capitalise(trimmed.replace(/[_-]/g, ' ')) };
}

function renderBoolean(value: boolean | null | undefined) {
  if (value === true) {
    return <span className={styles.booleanYes}>Yes</span>;
  }
  if (value === false) {
    return <span className={styles.booleanNo}>No</span>;
  }
  return <span className={styles.booleanUnknown}>Unknown</span>;
}

function renderForcePush(value: boolean | null | undefined) {
  if (value === null || value === undefined) {
    return <span className={styles.booleanUnknown}>Unknown</span>;
  }
  return value ? <span className={styles.booleanNo}>Allowed</span> : <span className={styles.booleanYes}>Blocked</span>;
}

function renderLastPush(iso: string | null) {
  if (!iso) {
    return <span className={styles.booleanUnknown}>Unknown</span>;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return <span className={styles.booleanUnknown}>Unknown</span>;
  }
  return date.toLocaleString();
}

function renderSecurity(isEnabled: boolean | null, status?: string) {
  const parsed = parseStatus(status ?? '');
  const label = parsed?.label;
  const detail = parsed?.detail;
  const className = determineSecurityClass(isEnabled, label);

  if (!label) {
    if (isEnabled === null) {
      return <span className={styles.booleanUnknown}>Unknown</span>;
    }
    return isEnabled ? <span className={styles.booleanYes}>Enabled</span> : <span className={styles.booleanNo}>Disabled</span>;
  }

  return (
    <span className={className} title={status ?? label}>
      {label}
      {detail ? <span className={styles.securityDetail}>{detail}</span> : null}
    </span>
  );
}
function describeSetting(field: RepoSettingField, enabled: boolean) {
  const labelMap: Record<RepoSettingField, string> = {
    deleteBranchOnMerge: 'delete branch on merge',
    allowAutoMerge: 'auto merge',
    allowUpdateBranch: 'allow branch updates',
  };
  const action = enabled ? 'Enabled' : 'Disabled';
  return `${action} ${labelMap[field]}`;
}

export { renderBoolean, renderForcePush, renderLastPush, renderSecurity, determineSecurityClass, parseStatus, mapDetail, describeSetting };

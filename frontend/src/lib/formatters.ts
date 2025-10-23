const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;
const ONE_MONTH = 30 * ONE_DAY;
const ONE_YEAR = 365 * ONE_DAY;

export function formatRelativeTime(isoDate: string): string {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return "—";
  }

  const diff = Date.now() - timestamp;

  if (diff < ONE_MINUTE) {
    return "just now";
  }
  if (diff < ONE_HOUR) {
    const minutes = Math.round(diff / ONE_MINUTE);
    return `${minutes}m ago`;
  }
  if (diff < ONE_DAY) {
    const hours = Math.round(diff / ONE_HOUR);
    return `${hours}h ago`;
  }
  if (diff < ONE_WEEK) {
    const days = Math.round(diff / ONE_DAY);
    return `${days}d ago`;
  }
  if (diff < ONE_MONTH) {
    const weeks = Math.round(diff / ONE_WEEK);
    return `${weeks}w ago`;
  }
  if (diff < ONE_YEAR) {
    const months = Math.round(diff / ONE_MONTH);
    return `${months}mo ago`;
  }
  const years = Math.round(diff / ONE_YEAR);
  return `${years}y ago`;
}

export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

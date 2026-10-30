// Formatting utility functions matching Flutter's intl and custom formatting

export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  return `₹${Number(amount).toFixed(2)}`;
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateString);
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return String(dateString);
  }
}

export function formatTimeRemaining(untilDateString) {
  if (!untilDateString) return 'indefinitely';
  const until = new Date(untilDateString);
  const now = new Date();
  const diffMs = until.getTime() - now.getTime();
  if (diffMs <= 0) return 'shortly';
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 1) {
    const remHours = diffHours % 24;
    return `in ${diffDays}d ${remHours}h`;
  }
  if (diffHours >= 1) {
    const remMins = diffMinutes % 60;
    return `in ${diffHours}h ${remMins}m`;
  }
  return `in ${diffMinutes}m`;
}

export function truncateHash(hash, length = 8) {
  if (!hash) return '';
  return hash.length > length ? `${hash.substring(0, length)}...` : hash;
}

export function formatRelativeDate(dateString) {
  if (!dateString) return 'Just now';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 7) {
      return formatDate(dateString);
    }
    if (diffDay >= 1) {
      return `${diffDay}d ago`;
    }
    if (diffHour >= 1) {
      return `${diffHour}h ago`;
    }
    if (diffMin >= 1) {
      return `${diffMin}m ago`;
    }
    return 'Just now';
  } catch {
    return String(dateString);
  }
}


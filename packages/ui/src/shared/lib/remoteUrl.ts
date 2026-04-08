const bareDomainPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?:[/?#].*)?$/i;

export function normalizeRemoteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (bareDomainPattern.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return '';
}

export function isSingleHttpUrl(raw: string): boolean {
  return /^https?:\/\/\S+$/i.test(raw.trim());
}

export function getRemoteUrlHostname(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./i, '');
  } catch {
    return raw;
  }
}

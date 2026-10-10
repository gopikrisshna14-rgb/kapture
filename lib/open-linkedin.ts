/**
 * On Android, an intent:// URL opens the LinkedIn app directly (falling back to the browser),
 * which is more reliable than relying on App Links from inside an installed PWA.
 */
export function linkedInHref(url: string, userAgent?: string): string {
  if (!userAgent || !/Android/i.test(userAgent)) return url;
  try {
    const u = new URL(url);
    const fallback = encodeURIComponent(url);
    return `intent://${u.host}${u.pathname}#Intent;scheme=https;package=com.linkedin.android;S.browser_fallback_url=${fallback};end`;
  } catch {
    return url;
  }
}

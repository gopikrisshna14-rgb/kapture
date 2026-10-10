/** Canonical form: https://www.linkedin.com/in/<slug> (no query, no trailing slash). */
export function normalizeLinkedInUrl(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (!(host === "linkedin.com" || host.endsWith(".linkedin.com"))) return null;
  const m = u.pathname.match(/^\/(?:mwlite\/)?in\/([^/?#]+)/i);
  if (!m) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(m[1]);
  } catch {
    slug = m[1];
  }
  slug = slug.trim();
  if (!slug || slug.length > 100) return null;
  return `https://www.linkedin.com/in/${encodeURIComponent(slug).replace(/%2D/gi, "-")}`;
}

export const isLinkedInProfileUrl = (s: string) => normalizeLinkedInUrl(s) !== null;

export const isLinkedInShortLink = (s: string) => /^https?:\/\/lnkd\.in\/[\w-]+/i.test(s.trim());

/** Pulls the first LinkedIn profile URL (or lnkd.in short link) out of shared text. */
export function extractLinkedInUrl(text: string): string | null {
  const urls = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  for (const raw of urls) {
    const clean = raw.replace(/[).,;!?]+$/, "");
    const n = normalizeLinkedInUrl(clean);
    if (n) return n;
  }
  for (const raw of urls) if (isLinkedInShortLink(raw)) return raw.replace(/[).,;!?]+$/, "");
  // Bare "linkedin.com/in/…" without scheme
  const bare = text.match(/(?:[\w-]+\.)?linkedin\.com\/(?:mwlite\/)?in\/[^\s<>"']+/i);
  return bare ? normalizeLinkedInUrl(bare[0]) : null;
}

/** "Lena Hoffmann" -> "Lena". */
export const firstNameOf = (full?: string | null) => (full ? full.trim().split(/\s+/)[0] : null) || null;

/** Best-effort readable name from a profile slug, used only as a placeholder label, never stored as the name. */
export function slugLabel(url: string) {
  const m = url.match(/\/in\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : url;
}

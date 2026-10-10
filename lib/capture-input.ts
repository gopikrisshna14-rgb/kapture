import "server-only";
import { extractLinkedInUrl, isLinkedInShortLink, normalizeLinkedInUrl } from "./linkedin";

/** Resolves lnkd.in short links by reading the redirect target. No cookies, no login. */
export async function resolveLinkedIn(raw: string): Promise<string | null> {
  const direct = normalizeLinkedInUrl(raw) ?? extractLinkedInUrl(raw);
  if (direct && !isLinkedInShortLink(direct)) return direct;
  const short = isLinkedInShortLink(raw) ? raw.trim() : direct;
  if (!short || !isLinkedInShortLink(short)) return null;
  try {
    const r = await fetch(short, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    const loc = r.headers.get("location");
    return loc ? (normalizeLinkedInUrl(loc) ?? extractLinkedInUrl(loc)) : null;
  } catch {
    return null;
  }
}

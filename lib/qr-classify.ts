import { extractLinkedInUrl, isLinkedInShortLink } from "./linkedin";
import { parseContactPayload, type ContactFields } from "./vcard";

export type QrPayload =
  | { kind: "linkedin"; url: string }
  | { kind: "contact"; fields: ContactFields }
  | { kind: "link"; url: string }
  | { kind: "unknown"; text: string };

/** LinkedIn profile URL -> pipeline; vCard/MECARD -> fields; other URL -> link. */
export function classifyQr(text: string): QrPayload {
  const t = text.trim();
  const contact = parseContactPayload(t);
  if (contact) return { kind: "contact", fields: contact };
  if (isLinkedInShortLink(t)) return { kind: "linkedin", url: t };
  const li = /^https?:\/\//i.test(t) || /linkedin\.com/i.test(t) ? extractLinkedInUrl(t) : null;
  if (li) return { kind: "linkedin", url: li };
  if (/^https?:\/\/\S+$/i.test(t)) return { kind: "link", url: t };
  return { kind: "unknown", text: t };
}

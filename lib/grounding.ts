// Pure, dependency-free helpers for grounded AI output. Unit-tested in tests/grounding.test.ts.
import type { Brief, NormalizedProfile, Starter } from "./types";

/** Profile fields a conversation starter may cite. */
export const STARTER_FIELDS = [
  "headline",
  "about",
  "location",
  "company",
  "role",
  "experience",
  "education",
  "skills",
  "recentPosts",
] as const;

export function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.some(hasValue);
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).some(hasValue);
  return Boolean(v);
}

/** Drops every starter whose source_field is not a known profile field with a non-empty value. */
export function verifyStarters(starters: Starter[] | undefined, profile: NormalizedProfile): Starter[] {
  if (!Array.isArray(starters)) return [];
  return starters.filter(
    (s) =>
      s &&
      typeof s.text === "string" &&
      s.text.trim() &&
      (STARTER_FIELDS as readonly string[]).includes(s.source_field) &&
      hasValue((profile as Record<string, unknown>)[s.source_field]),
  );
}

export function verifyBrief(brief: Partial<Brief> | null | undefined, profile: NormalizedProfile): Brief {
  const inShort = typeof brief?.in_short === "string" && brief.in_short.trim() ? brief.in_short.trim() : null;
  return {
    // Nothing to summarise means no summary, not a guessed one.
    in_short: briefableFieldCount(profile) > 0 ? inShort : null,
    starters: verifyStarters(brief?.starters, profile).slice(0, 4),
  };
}

export function briefableFieldCount(p: NormalizedProfile) {
  return STARTER_FIELDS.filter((k) => hasValue(p[k])).length;
}

/** Share of expected fields present (pilot metric `profile_completeness`). */
export const COMPLETENESS_FIELDS = ["name", ...STARTER_FIELDS, "photoUrl"] as const;
export function completeness(p: NormalizedProfile): number {
  const filled = COMPLETENESS_FIELDS.filter((k) => hasValue(p[k])).length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100) / 100;
}

/** Strips empty values so the model only ever sees what is actually there. */
export function compactProfile(p: NormalizedProfile): Partial<NormalizedProfile> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (k === "raw" || k === "photoUrl" || k === "linkedinUrl") continue;
    if (hasValue(v)) out[k] = v;
  }
  return out as Partial<NormalizedProfile>;
}

// ---------- Connection note templates ----------

export interface NoteVars {
  first_name?: string | null;
  company?: string | null;
  event?: string | null;
}

/**
 * Fills {first_name}, {company}, {event}. A placeholder with no value is removed together with the
 * words that depend on it ("at {company}" -> ""), so the note never contains a blank or a guess.
 */
export function fillTemplate(body: string, vars: NoteVars): string {
  let s = body;
  for (const key of ["first_name", "company", "event"] as const) {
    const val = vars[key]?.trim();
    if (val) {
      s = s.split(`{${key}}`).join(val);
    } else {
      s = s
        .replace(new RegExp(`\\s*(?:at|from|with|in)\\s+\\{${key}\\}`, "gi"), "")
        .replace(new RegExp(`\\s*\\{${key}\\}`, "g"), "");
    }
  }
  return s
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/^(Hi|Hello|Hey),/i, "$1,")
    .replace(/^(Hi|Hello|Hey)\s*,\s*/i, (m, g) => `${g}, `)
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Trims to max chars on a word boundary, keeping a full sentence where possible. */
export function clampNote(note: string, max: number): string {
  if (note.length <= max) return note;
  const cut = note.slice(0, max);
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentenceEnd > max * 0.5) return cut.slice(0, sentenceEnd + 1);
  const space = cut.lastIndexOf(" ");
  return (space > 0 ? cut.slice(0, space) : cut).replace(/[,;:]$/, "") + "…";
}

/** "Friendlier" / "Shorter" deterministic rewrites (used by the chips; no AI needed). */
export function shorter(note: string): string {
  const sentences = note.match(/[^.!?]+[.!?]*/g) ?? [note];
  return sentences.length > 1 ? sentences.slice(0, -1).join("").trim() || sentences[0].trim() : note;
}

export function friendlier(note: string): string {
  let s = note.replace(/^Hi\b/, "Hey").replace(/\bI'd like to\b/, "I'd love to");
  if (!/[!]/.test(s)) s = s.replace(/\.(\s|$)/, "!$1");
  return s;
}

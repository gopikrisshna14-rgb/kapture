import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Repo } from "./db/repo";
import type { Person } from "./types";
import { toCsv } from "./csv";
import { CONSENT_LABELS, LABEL_SETS, SOURCE_LABELS } from "./labels";
import { serverSecret } from "./config";

export type ExportFilter = "all" | "priority" | "not_followed_up";
export const parseFilter = (v: unknown): ExportFilter => (v === "priority" || v === "not_followed_up" ? v : "all");

export async function buildCsv(repo: Repo, filter: ExportFilter) {
  const [profile, people, events, requests] = await Promise.all([repo.getProfile(), repo.listPeople(), repo.listEvents(), repo.listRequests()]);
  const labels = LABEL_SETS[profile?.purpose ?? "selling"];
  const ev = new Map(events.map((e) => [e.id, e.name]));
  const req = new Map(requests.map((r) => [r.person_id, r.status]));
  const rows = people.filter((p: Person) =>
    filter === "priority" ? p.priority === "priority" : filter === "not_followed_up" ? !p.followed_up_at : true,
  );
  const csv = toCsv(
    ["Name", "Role", "Company", "Location", "Email", "Phone", "Website", "LinkedIn", "Event", "Priority", "Connect status", "Follow up due", "Followed up", "Voice note summary", "Next steps", "Source", "Details from", "Added"],
    rows.map((p) => [
      p.full_name,
      p.role_title ?? p.headline,
      p.company,
      p.location,
      p.email,
      p.phone,
      p.website,
      p.linkedin_url,
      p.event_id ? ev.get(p.event_id) : "",
      labels[p.priority],
      req.get(p.id) ?? "",
      p.followup_due,
      p.followed_up_at ? p.followed_up_at.slice(0, 10) : "",
      p.ai_summary,
      p.next_steps ?? [],
      SOURCE_LABELS[p.source],
      p.consent_basis ? CONSENT_LABELS[p.consent_basis] : "Typed by you",
      p.created_at.slice(0, 10),
    ]),
  );
  return { csv, count: rows.length };
}

const b64u = (b: Buffer) => b.toString("base64url");

/** Short-lived signed link (24 h) for "Email it to me". Bound to the user and the filter. */
export function signExport(userId: string, filter: ExportFilter, ttlMs = 24 * 3600_000) {
  const payload = b64u(Buffer.from(JSON.stringify({ u: userId, f: filter, e: Date.now() + ttlMs })));
  const sig = b64u(createHmac("sha256", serverSecret()).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifyExport(token: string): { userId: string; filter: ExportFilter } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expect = createHmac("sha256", serverSecret()).update(payload).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== expect.length || !timingSafeEqual(got, expect)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u: string; f: string; e: number };
    if (Date.now() > d.e) return null;
    return { userId: d.u, filter: parseFilter(d.f) };
  } catch {
    return null;
  }
}

export const csvFilename = () => `catch-people-${new Date().toISOString().slice(0, 10)}.csv`;

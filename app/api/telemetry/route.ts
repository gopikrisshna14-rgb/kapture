import { fail, json, readJson, withRepo } from "@/lib/api";

// Client-reported pilot events. Server-side events are logged directly by the routes that cause them.
const ALLOWED = new Set([
  "capture_started",
  "capture_saved",
  "note_copied",
  "followup_email_opened",
]);

export const POST = withRepo(async (req, repo) => {
  const b = await readJson<{ event?: string; meta?: Record<string, unknown>; person_id?: string }>(req);
  if (!b.event || !ALLOWED.has(b.event)) return fail("Unknown event");
  // Only numeric / short meta values: no personal data in telemetry.
  const meta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(b.meta ?? {})) {
    if (typeof v === "number" || typeof v === "boolean" || (typeof v === "string" && v.length <= 40)) meta[k] = v;
  }
  if (b.person_id && !(await repo.getPerson(b.person_id))) return fail("Unknown person", 404);
  await repo.logEvent(b.event, b.person_id ?? null, Object.keys(meta).length ? meta : null);
  return json({ ok: true });
});

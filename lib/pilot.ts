// Pure pilot metrics over usage_events (unit-tested).
import type { UsageEvent } from "./types";

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function pilotMetrics(events: UsageEvent[]) {
  const by = (name: string) => events.filter((e) => e.event === name);
  const saved = by("capture_saved");
  const captureMs = saved.map((e) => num(e.meta?.ms_from_start)).filter((x): x is number => x !== null);
  const completeness = by("profile_completeness").map((e) => num(e.meta?.value)).filter((x): x is number => x !== null);

  // Follow-up within 24h: an email opened or a LinkedIn request marked sent within 24h of the capture being saved.
  const savedAt = new Map<string, number>();
  for (const e of saved) if (e.person_id && !savedAt.has(e.person_id)) savedAt.set(e.person_id, Date.parse(e.at));
  const followed = new Set<string>();
  for (const e of events) {
    if ((e.event === "followup_email_opened" || e.event === "request_marked_sent") && e.person_id) {
      const t0 = savedAt.get(e.person_id);
      if (t0 !== undefined && Date.parse(e.at) - t0 <= 24 * 3600_000) followed.add(e.person_id);
    }
  }
  const sentPeople = new Set(by("request_marked_sent").map((e) => e.person_id));
  const acceptedPeople = new Set(by("request_marked_accepted").map((e) => e.person_id));
  const users = new Set(events.map((e) => e.user_id).filter(Boolean));

  return {
    users: users.size,
    captures: saved.length,
    medianCaptureSeconds: captureMs.length ? Math.round(median(captureMs)! / 100) / 10 : null,
    medianCompleteness: median(completeness),
    followupWithin24h: savedAt.size ? followed.size / savedAt.size : null,
    acceptanceRate: sentPeople.size ? [...acceptedPeople].filter((p) => sentPeople.has(p)).length / sentPeople.size : null,
    enrichment: { ok: by("enrichment_ok").length, partial: by("enrichment_partial").length, failed: by("enrichment_failed").length },
    notesCopied: by("note_copied").length,
    requestsSent: sentPeople.size,
    accepted: acceptedPeople.size,
    exports: by("export_done").length,
  };
}

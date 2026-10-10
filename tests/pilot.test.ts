import { test } from "node:test";
import assert from "node:assert/strict";
import { pilotMetrics, median } from "../lib/pilot.ts";

const ev = (event: string, person_id: string | null, at: string, meta: Record<string, unknown> | null = null) => ({ user_id: "u", event, person_id, at, meta });

test("median", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), null);
});

test("pilot metrics", () => {
  const m = pilotMetrics([
    ev("capture_saved", "a", "2026-10-10T10:00:00Z", { ms_from_start: 12000 }),
    ev("capture_saved", "b", "2026-10-10T10:05:00Z", { ms_from_start: 20000 }),
    ev("profile_completeness", "a", "2026-10-10T10:00:01Z", { value: 0.8 }),
    ev("request_marked_sent", "a", "2026-10-10T18:00:00Z"),
    ev("followup_email_opened", "b", "2026-10-12T10:00:00Z"),
    ev("request_marked_accepted", "a", "2026-10-13T10:00:00Z"),
  ]);
  assert.equal(m.medianCaptureSeconds, 16);
  assert.equal(m.medianCompleteness, 0.8);
  assert.equal(m.followupWithin24h, 0.5);
  assert.equal(m.acceptanceRate, 1);
});

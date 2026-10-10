import { fail, json, readJson, str, withRepo } from "@/lib/api";
import type { ConnectRequest } from "@/lib/types";

type Ctx = { params: Promise<{ personId: string }> };

/** Save the note and/or move the status. Assisted mode only: nothing is sent to LinkedIn from here. */
export const PUT = withRepo<Ctx>(async (req, repo, { params }) => {
  const { personId } = await params;
  const person = await repo.getPerson(personId);
  if (!person) return fail("Not found", 404);
  const b = await readJson(req);
  const profile = await repo.getProfile();
  const max = profile?.max_note_length ?? 200;
  const patch: Partial<ConnectRequest> = { mode: "assisted" };
  if ("note" in b) {
    const note = str(b.note, 1000);
    if (note && note.length > max) return fail(`Keep the note under ${max} characters.`);
    patch.note = note;
  }
  const existing = await repo.getRequestForPerson(personId);
  if (b.status === "queued") {
    patch.status = "queued";
    patch.sent_at = null;
    patch.accepted_at = null;
  } else if (b.status === "sent") {
    patch.status = "sent";
    patch.sent_at = new Date().toISOString();
  } else if (b.status === "accepted") {
    patch.status = "accepted";
    patch.accepted_at = new Date().toISOString();
    if (!existing?.sent_at) patch.sent_at = patch.accepted_at;
  }
  const r = await repo.upsertRequest(personId, patch);
  if (b.status === "sent" && existing?.status !== "sent") await repo.logEvent("request_marked_sent", personId, null);
  if (b.status === "accepted" && existing?.status !== "accepted") await repo.logEvent("request_marked_accepted", personId, null);
  return json(r);
});

export const DELETE = withRepo<Ctx>(async (_req, repo, { params }) => {
  const { personId } = await params;
  await repo.deleteRequestForPerson(personId);
  return json({ ok: true });
});

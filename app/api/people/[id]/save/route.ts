import { fail, json, readJson, str, withRepo } from "@/lib/api";
import { personPatchFrom } from "@/lib/person-patch";
import { summarizeVoice } from "@/lib/ai";
import { defaultNote } from "@/lib/notes";

export const maxDuration = 60;

/** Review screen "Save": fields, priority, voice note (+ AI summary), reminder, connect queue. */
export const POST = withRepo<{ params: Promise<{ id: string }> }>(async (req, repo, { params }) => {
  const { id } = await params;
  const b = await readJson(req);
  const before = await repo.getPerson(id);
  if (!before) return fail("Not found", 404);

  const patch = personPatchFrom(b);
  if ("voice_transcript" in b) {
    const t = str(b.voice_transcript, 8000);
    patch.voice_transcript = t;
    if (t !== before.voice_transcript) {
      if (!t) {
        patch.ai_summary = null;
        patch.next_steps = null;
      } else {
        try {
          const s = await summarizeVoice(t);
          patch.ai_summary = s.summary;
          patch.next_steps = s.next_steps;
        } catch {
          // Keep the transcript even if the summary fails; it can be regenerated later.
        }
      }
    }
  }
  let person = await repo.updatePerson(id, patch);

  if (b.queue === true) {
    const existing = await repo.getRequestForPerson(id);
    if (!existing) await repo.upsertRequest(id, { note: await defaultNote(repo, person), status: "queued", mode: "assisted" });
  } else if (b.queue === false) {
    const existing = await repo.getRequestForPerson(id);
    if (existing?.status === "queued") await repo.deleteRequestForPerson(id);
  }

  if (b.first_save === true) {
    const ms = typeof b.ms_from_start === "number" && b.ms_from_start > 0 && b.ms_from_start < 3_600_000 ? Math.round(b.ms_from_start) : null;
    await repo.logEvent("capture_saved", id, { ms_from_start: ms, source: person.source });
  }
  person = (await repo.getPerson(id)) ?? person;
  return json(person);
});

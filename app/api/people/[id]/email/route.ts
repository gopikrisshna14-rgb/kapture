import { fail, json, readJson, withRepo } from "@/lib/api";
import { draftEmail, type Tone } from "@/lib/ai";

export const maxDuration = 60;

export const POST = withRepo<{ params: Promise<{ id: string }> }>(async (req, repo, { params }) => {
  const { id } = await params;
  const person = await repo.getPerson(id);
  if (!person) return fail("Not found", 404);
  const b = await readJson(req);
  const tone: Tone = b.tone === "direct" || b.tone === "short" ? b.tone : "friendly";
  const [profile, event] = await Promise.all([repo.getProfile(), person.event_id ? repo.getEvent(person.event_id) : null]);
  try {
    const draft = await draftEmail({
      firstName: person.first_name,
      company: person.company,
      eventName: event?.name ?? null,
      brief: person.brief,
      transcript: person.voice_transcript,
      nextSteps: person.next_steps,
      senderName: profile?.display_name ?? null,
      tone,
    });
    return json(draft);
  } catch {
    return fail("Couldn't write a draft right now. You can write it yourself.", 502);
  }
});

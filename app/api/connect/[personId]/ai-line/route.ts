import { fail, json, readJson, str, withRepo } from "@/lib/api";
import { noteLine } from "@/lib/ai";

export const maxDuration = 60;

/** One optional sentence grounded in the profile or the user's own voice note. */
export const POST = withRepo<{ params: Promise<{ personId: string }> }>(async (req, repo, { params }) => {
  const { personId } = await params;
  const person = await repo.getPerson(personId);
  if (!person) return fail("Not found", 404);
  const b = await readJson(req);
  const profile = await repo.getProfile();
  try {
    const line = await noteLine({
      profile: person.raw_enrichment,
      transcript: person.voice_transcript,
      base: str(b.base, 1000) ?? "",
      maxLength: profile?.max_note_length ?? 200,
    });
    return json({ line });
  } catch {
    return json({ line: null });
  }
});

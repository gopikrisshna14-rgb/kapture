import { fail, json, withRepo } from "@/lib/api";
import { getProfileProvider } from "@/lib/providers";
import { matchReasons } from "@/lib/match";

export const maxDuration = 300;

export const GET = withRepo<{ params: Promise<{ id: string }> }>(async (_req, repo, { params }) => {
  const { id } = await params;
  const person = await repo.getPerson(id);
  if (!person) return fail("Not found", 404);
  const provider = getProfileProvider();
  if (!provider.findProfile || !person.full_name) return json({ candidates: [] });
  try {
    const found = await provider.findProfile({ name: person.full_name, company: person.company, city: person.location });
    return json({
      candidates: found.map((c) => ({ ...c, ...matchReasons(person, c) })),
    });
  } catch {
    return json({ candidates: [] });
  }
});

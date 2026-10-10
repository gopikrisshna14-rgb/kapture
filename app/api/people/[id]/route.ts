import { fail, json, readJson, withRepo } from "@/lib/api";
import { personPatchFrom } from "@/lib/person-patch";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withRepo<Ctx>(async (_req, repo, { params }) => {
  const { id } = await params;
  const person = await repo.getPerson(id);
  if (!person) return fail("Not found", 404);
  const request = await repo.getRequestForPerson(id);
  const photo = person.photo_path ? await repo.photoUrl(person.photo_path) : null;
  return json({ ...person, request, photo_url: photo });
});

export const PATCH = withRepo<Ctx>(async (req, repo, { params }) => {
  const { id } = await params;
  const patch = personPatchFrom(await readJson(req));
  return json(await repo.updatePerson(id, patch));
});

/** Hard delete: row, connect request, cached enrichment and stored photo. */
export const DELETE = withRepo<Ctx>(async (_req, repo, { params }) => {
  const { id } = await params;
  await repo.deletePerson(id);
  return json({ ok: true });
});

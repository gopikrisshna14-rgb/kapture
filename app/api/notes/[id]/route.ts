import { json, readJson, str, withRepo } from "@/lib/api";
import type { NoteTemplate } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withRepo<Ctx>(async (req, repo, { params }) => {
  const { id } = await params;
  const b = await readJson(req);
  const patch: Partial<NoteTemplate> = {};
  if ("name" in b) patch.name = str(b.name, 60);
  if ("body" in b) patch.body = str(b.body, 600);
  if (b.is_default === true) {
    // Exactly one default.
    for (const t of await repo.listTemplates()) if (t.is_default && t.id !== id) await repo.updateTemplate(t.id, { is_default: false });
    patch.is_default = true;
  }
  return json(await repo.updateTemplate(id, patch));
});

export const DELETE = withRepo<Ctx>(async (_req, repo, { params }) => {
  const { id } = await params;
  await repo.deleteTemplate(id);
  return json({ ok: true });
});

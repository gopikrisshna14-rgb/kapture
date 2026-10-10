import { fail, json, readJson, str, withRepo } from "@/lib/api";
import { ensureTemplates } from "@/lib/profile-setup";

export const GET = withRepo(async (_req, repo) => {
  const profile = await repo.getProfile();
  return json(await ensureTemplates(repo, profile?.purpose ?? "selling"));
});

export const POST = withRepo(async (req, repo) => {
  const b = await readJson(req);
  const body = str(b.body, 600);
  if (!body) return fail("Write the note first.");
  const t = await repo.createTemplate({ name: str(b.name, 60) ?? "My note", body, is_default: false });
  return json(t, 201);
});

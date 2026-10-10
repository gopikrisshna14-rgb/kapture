import { json, readJson, withRepo } from "@/lib/api";
import { addMonths } from "@/lib/pipeline";

/** "Delete people after 12 months": sets delete_after on every person (or clears it). */
export const POST = withRepo(async (req, repo) => {
  const b = await readJson(req);
  const on = b.enabled === true;
  await repo.updateProfile({ auto_delete_months: on ? 12 : null });
  for (const p of await repo.listPeople()) {
    await repo.updatePerson(p.id, { delete_after: on ? addMonths(new Date(p.created_at), 12).toISOString() : null });
  }
  return json({ ok: true, enabled: on });
});

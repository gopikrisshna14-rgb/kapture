import { fail, json, readJson, str, withRepo } from "@/lib/api";
import { ensureTemplates } from "@/lib/profile-setup";

export const GET = withRepo(async (_req, repo) => json(await repo.listEvents()));

export const POST = withRepo(async (req, repo) => {
  const b = await readJson(req);
  const name = str(b.name, 120);
  if (!name) return fail("Give the event a name.");
  const date = typeof b.event_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.event_date) ? b.event_date : new Date().toISOString().slice(0, 10);
  const delay = [1, 2, 7].includes(Number(b.followup_delay_days)) ? Number(b.followup_delay_days) : 2;
  const event = await repo.createEvent({ name, event_date: date, followup_delay_days: delay });
  const purpose = b.purpose === "hiring" || b.purpose === "networking" ? b.purpose : "selling";
  await repo.updateProfile({ current_event_id: event.id, purpose });
  await ensureTemplates(repo, purpose);
  return json(event, 201);
});

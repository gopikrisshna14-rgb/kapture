import "server-only";
import type { Repo } from "./db/repo";
import type { Person } from "./types";
import { clampNote, fillTemplate } from "./grounding";
import { ensureTemplates } from "./profile-setup";

export async function noteContext(repo: Repo, person: Person) {
  const profile = await repo.getProfile();
  const event = person.event_id ? await repo.getEvent(person.event_id) : null;
  const templates = await ensureTemplates(repo, profile?.purpose ?? "selling");
  return {
    profile,
    event,
    templates,
    maxLength: profile?.max_note_length ?? 200,
    vars: { first_name: person.first_name, company: person.company, event: event?.name ?? null },
  };
}

export async function defaultNote(repo: Repo, person: Person) {
  const ctx = await noteContext(repo, person);
  const t = ctx.templates.find((x) => x.is_default) ?? ctx.templates[0];
  return clampNote(fillTemplate(t?.body ?? "Hi {first_name}, nice meeting you at {event}.", ctx.vars), ctx.maxLength);
}

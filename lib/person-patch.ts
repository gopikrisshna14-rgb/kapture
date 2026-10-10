import { str } from "./api";
import type { Person, Priority } from "./types";
import { firstNameOf } from "./linkedin";

const TEXT_FIELDS = ["full_name", "role_title", "company", "location", "email", "phone", "website", "headline", "notes"] as const;

export function personPatchFrom(b: Record<string, unknown>): Partial<Person> {
  const patch: Partial<Person> = {};
  for (const k of TEXT_FIELDS) if (k in b) (patch as Record<string, unknown>)[k] = str(b[k], k === "notes" ? 4000 : 300);
  if ("full_name" in patch) patch.first_name = firstNameOf(patch.full_name);
  if (b.priority === "priority" || b.priority === "follow_up" || b.priority === "just_met") patch.priority = b.priority as Priority;
  if ("followup_due" in b) patch.followup_due = typeof b.followup_due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.followup_due) ? b.followup_due : null;
  if (b.followed_up === true) patch.followed_up_at = new Date().toISOString();
  if (b.followed_up === false) patch.followed_up_at = null;
  return patch;
}


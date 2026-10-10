import { fail, json, readJson, str, withRepo } from "@/lib/api";
import { slugHandle } from "@/lib/profile-setup";
import { normalizeLinkedInUrl } from "@/lib/linkedin";
import type { Profile } from "@/lib/types";

export const GET = withRepo(async (_req, repo) => json(await repo.getProfile()));

export const PATCH = withRepo(async (req, repo) => {
  const b = await readJson(req);
  const patch: Partial<Profile> = {};
  if ("display_name" in b) patch.display_name = str(b.display_name, 120);
  if ("headline" in b) patch.headline = str(b.headline, 200);
  if ("company" in b) patch.company = str(b.company, 120);
  if ("linkedin_url" in b) {
    const raw = str(b.linkedin_url, 300);
    if (raw) {
      const u = normalizeLinkedInUrl(raw);
      if (!u) return fail("That doesn't look like a LinkedIn profile link.");
      patch.linkedin_url = u;
    } else patch.linkedin_url = null;
  }
  if ("handle" in b) {
    const h = slugHandle(String(b.handle ?? ""));
    if (h.length < 3) return fail("Pick a handle with at least 3 letters or numbers.");
    if (await repo.isHandleTaken(h)) return fail("That handle is taken.", 409);
    patch.handle = h;
  }
  if (b.connect_mode === "assisted" || b.connect_mode === "direct") {
    // v1 implements assisted only; direct is stored but the UI keeps it disabled.
    patch.connect_mode = "assisted";
  }
  if (b.purpose === "selling" || b.purpose === "hiring" || b.purpose === "networking") patch.purpose = b.purpose;
  if (typeof b.max_note_length === "number") patch.max_note_length = Math.min(300, Math.max(80, Math.round(b.max_note_length)));
  if ("auto_delete_months" in b) patch.auto_delete_months = b.auto_delete_months === null ? null : 12;
  if (typeof b.current_event_id === "string") {
    if (!(await repo.getEvent(b.current_event_id))) return fail("Unknown event", 404);
    patch.current_event_id = b.current_event_id;
  }
  try {
    return json(await repo.updateProfile(patch));
  } catch (e) {
    if (e instanceof Error && /duplicate key/.test(e.message)) return fail("That handle is taken.", 409);
    throw e;
  }
});

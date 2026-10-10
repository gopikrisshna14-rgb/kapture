import { json, withRepo } from "@/lib/api";
import { backendSummary } from "@/lib/config";

/** Profile + current event for client screens. */
export const GET = withRepo(async (_req, repo) => {
  const profile = await repo.getProfile();
  const event = profile?.current_event_id ? await repo.getEvent(profile.current_event_id) : null;
  return json({ profile, event, backends: backendSummary() });
});

import "server-only";
import { redirect } from "next/navigation";
import { getRepo } from "./session";

/** For server-rendered pages: the user's repo + profile, or a redirect to sign-in / onboarding. */
export async function requireUser(opts: { needEvent?: boolean } = { needEvent: true }) {
  const repo = await getRepo();
  if (!repo) redirect("/welcome");
  const profile = await repo.getProfile();
  if (!profile) redirect("/welcome");
  if (opts.needEvent !== false && !profile.current_event_id) redirect("/onboarding/linkedin");
  return { repo, profile };
}

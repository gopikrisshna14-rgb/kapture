import { redirect } from "next/navigation";
import { getRepo } from "@/lib/session";

export default async function Home() {
  const repo = await getRepo();
  if (!repo) redirect("/welcome");
  const profile = await repo.getProfile();
  redirect(profile?.current_event_id ? "/people" : "/onboarding/linkedin");
}

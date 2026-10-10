import { requireUser } from "@/lib/server-page";
import { EventSetup } from "@/components/event-setup";

export default async function Page() {
  const { profile, repo } = await requireUser({ needEvent: false });
  const past = (await repo.listEvents()).map((e) => ({ id: e.id, name: e.name, event_date: e.event_date }));
  return <EventSetup purpose={profile.purpose} back="/onboarding/linkedin" past={past} />;
}

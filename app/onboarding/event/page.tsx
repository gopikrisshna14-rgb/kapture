import { requireUser } from "@/lib/server-page";
import { EventSetup } from "@/components/event-setup";

export default async function Page() {
  const { profile } = await requireUser({ needEvent: false });
  return <EventSetup purpose={profile.purpose} back="/onboarding/linkedin" />;
}

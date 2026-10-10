import { requireUser } from "@/lib/server-page";
import { LinkLinkedIn } from "./link-linkedin";

export default async function Page() {
  const { profile } = await requireUser({ needEvent: false });
  return (
    <LinkLinkedIn
      initial={{ display_name: profile.display_name ?? "", linkedin_url: profile.linkedin_url ?? "" }}
      fromAccount={Boolean(profile.current_event_id)}
    />
  );
}

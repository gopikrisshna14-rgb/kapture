import { requireUser } from "@/lib/server-page";
import { FREE_CAPTURE_LIMIT, backendSummary } from "@/lib/config";
import { PeopleList } from "./people-list";

export default async function PeoplePage() {
  const { repo, profile } = await requireUser();
  const [events, people, requests] = await Promise.all([repo.listEvents(), repo.listPeople(), repo.listRequests()]);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const used = await repo.countCapturesSince(monthStart);
  const reqBy = new Map(requests.map((r) => [r.person_id, r.status]));
  const current = events.find((e) => e.id === profile.current_event_id) ?? events[0] ?? null;
  const list = people
    .filter((p) => !current || p.event_id === current.id)
    .map((p) => ({
      id: p.id,
      full_name: p.full_name,
      role_title: p.role_title,
      company: p.company,
      headline: p.headline,
      priority: p.priority,
      created_at: p.created_at,
      enrichment_status: p.enrichment_status,
      linkedin_url: p.linkedin_url,
      website: p.website ?? null,
      followup_due: p.followup_due,
      followed_up_at: p.followed_up_at,
      connect: reqBy.get(p.id) ?? null,
    }));
  return (
    <PeopleList
      people={list}
      events={events.map((e) => ({ id: e.id, name: e.name, event_date: e.event_date }))}
      currentEventId={current?.id ?? null}
      purpose={profile.purpose}
      used={used}
      limit={FREE_CAPTURE_LIMIT}
      demo={backendSummary().data === "demo"}
    />
  );
}

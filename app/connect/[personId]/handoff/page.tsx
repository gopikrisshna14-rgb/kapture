import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server-page";
import { Handoff } from "./handoff";

export default async function HandoffPage({ params, searchParams }: { params: Promise<{ personId: string }>; searchParams: Promise<{ queue?: string }> }) {
  const { personId } = await params;
  const { queue } = await searchParams;
  const { repo } = await requireUser();
  const person = await repo.getPerson(personId);
  if (!person || !person.linkedin_url) notFound();
  const [request, requests] = await Promise.all([repo.getRequestForPerson(personId), repo.listRequests()]);
  const people = new Map((await repo.listPeople()).map((p) => [p.id, p]));
  const remaining = requests
    .filter((r) => r.status === "queued" && r.person_id !== personId && people.get(r.person_id)?.linkedin_url)
    .sort((a, b) => a.queued_at.localeCompare(b.queued_at));
  return (
    <Handoff
      personId={personId}
      firstName={person.first_name}
      linkedinUrl={person.linkedin_url}
      note={request?.note ?? ""}
      queueMode={queue === "1"}
      nextPersonId={remaining[0]?.person_id ?? null}
      remaining={remaining.length}
    />
  );
}

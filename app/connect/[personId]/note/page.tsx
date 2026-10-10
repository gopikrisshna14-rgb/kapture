import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server-page";
import { defaultNote, noteContext } from "@/lib/notes";
import { NoteEditor } from "./note-editor";

export default async function NotePage({ params, searchParams }: { params: Promise<{ personId: string }>; searchParams: Promise<{ queue?: string; ai?: string }> }) {
  const { personId } = await params;
  const sp = await searchParams;
  const { repo } = await requireUser();
  const person = await repo.getPerson(personId);
  if (!person) notFound();
  const ctx = await noteContext(repo, person);
  const request = await repo.getRequestForPerson(personId);
  // A note the user hasn't touched yet (filled from the default template at save time) can still get an AI line.
  const untouched = !request?.note || request.note === (await defaultNote(repo, person));
  const hasGrounding = Boolean(person.raw_enrichment || person.voice_transcript);
  return (
    <NoteEditor
      personId={personId}
      name={person.full_name}
      linkedinUrl={person.linkedin_url}
      templates={ctx.templates.map((t) => ({ id: t.id, name: t.name ?? "Note", body: t.body ?? "", is_default: t.is_default }))}
      vars={ctx.vars}
      maxLength={ctx.maxLength}
      savedNote={request?.note ?? null}
      queueMode={sp.queue === "1"}
      autoAi={(sp.ai === "1" || ctx.profile?.ai_personalise !== false) && hasGrounding && untouched && request?.status !== "sent"}
      canAi={hasGrounding}
    />
  );
}

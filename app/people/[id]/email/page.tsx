import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server-page";
import { EmailDraft } from "./email-draft";

export default async function EmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { repo } = await requireUser();
  const person = await repo.getPerson(id);
  if (!person) notFound();
  return <EmailDraft id={id} to={person.email} firstName={person.first_name} />;
}

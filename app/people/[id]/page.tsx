import Link from "next/link";
import { notFound } from "next/navigation";
import { Send, Mail, ChevronRight, Sparkles, MapPin, Phone, Globe, AtSign, Link2, SquarePen } from "lucide-react";
import { requireUser } from "@/lib/server-page";
import { Avatar, ButtonLink, Card, Chip, SectionLabel, TopBar } from "@/components/ui";
import { SourceChip } from "@/components/source-chip";
import { CONNECT_LABELS, CONSENT_LABELS, LABEL_SETS } from "@/lib/labels";
import { relativeTime, shortDate } from "@/lib/format";
import { PersonActions } from "./person-actions";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { repo, profile } = await requireUser();
  const person = await repo.getPerson(id);
  if (!person) notFound();
  const [request, event, photo] = await Promise.all([
    repo.getRequestForPerson(id),
    person.event_id ? repo.getEvent(person.event_id) : null,
    person.photo_path ? repo.photoUrl(person.photo_path) : null,
  ]);
  const labels = LABEL_SETS[profile.purpose];
  const sub = [person.role_title, person.company].filter(Boolean).join(" at ") || person.headline;
  const hasBrief = Boolean(person.brief?.in_short || person.brief?.starters?.length || person.raw_enrichment);

  return (
    <>
      <TopBar
        back="/people"
        right={
          <Link href={`/capture/${id}/review`} aria-label="Edit details" className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface">
            <SquarePen size={20} aria-hidden />
          </Link>
        }
      />
      <main className="px-6 pb-12">
        <div className="flex items-center gap-4">
          <Avatar name={person.full_name} src={photo} size={64} />
          <div className="min-w-0">
            <h1 className="text-[28px] font-extrabold leading-tight">{person.full_name ?? "Unnamed"}</h1>
            {sub && <p className="text-[15px] text-muted">{sub}</p>}
            {person.location && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-dim">
                <MapPin size={13} aria-hidden /> {person.location}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Chip tone={person.priority === "priority" ? "accent" : "default"}>{labels[person.priority]}</Chip>
          {event && <Chip>{event.name}</Chip>}
          {request && <Chip>{CONNECT_LABELS[request.status]}</Chip>}
          <SourceChip source={person.source} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {person.linkedin_url ? (
            <ButtonLink href={`/connect/${id}/note`} size="md" className="h-12">
              <Send size={18} aria-hidden /> <span className="text-[14px]">Connect on LinkedIn</span>
            </ButtonLink>
          ) : (
            <span className="inline-flex h-12 items-center justify-center rounded-full border border-line px-3 text-center text-[13px] text-dim">No LinkedIn profile</span>
          )}
          <ButtonLink href={`/people/${id}/email`} variant="secondary" size="md" className="h-12">
            <Mail size={18} aria-hidden /> Email
          </ButtonLink>
        </div>

        {(person.ai_summary || person.next_steps?.length) && (
          <section className="mt-8">
            <SectionLabel>From your voice note</SectionLabel>
            <Card>
              {person.ai_summary && <p className="text-[15px] leading-relaxed">{person.ai_summary}</p>}
              {!!person.next_steps?.length && (
                <>
                  <p className="mt-4 text-[13px] font-semibold text-muted">Next steps</p>
                  <ul className="mt-2 space-y-2">
                    {person.next_steps.map((s) => (
                      <li key={s} className="flex gap-2 text-[15px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden /> {s}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="mt-4 text-[12px] text-dim">Summary written by AI from your transcript.</p>
            </Card>
          </section>
        )}

        {person.voice_transcript && (
          <section className="mt-6">
            <SectionLabel>Voice note</SectionLabel>
            <Card className="text-[15px] leading-relaxed text-muted">&ldquo;{person.voice_transcript}&rdquo;</Card>
          </section>
        )}

        <section className="mt-6">
          <Link href={`/people/${id}/brief`} className="flex items-center gap-4 rounded-[22px] border border-line bg-surface p-5 hover:bg-surface-2">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-on-accent">
              <Sparkles size={20} aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block text-[16px] font-semibold">Profile brief</span>
              <span className="block text-[13px] text-muted">
                {person.enrichment_status === "pending"
                  ? "Being written…"
                  : hasBrief
                    ? "In short, experience, recent posts, conversation starters"
                    : "Nothing to show from a public profile yet"}
              </span>
            </span>
            <ChevronRight size={20} className="text-dim" aria-hidden />
          </Link>
        </section>

        <section className="mt-6">
          <SectionLabel>Details</SectionLabel>
          <Card className="space-y-3 p-4 text-[15px]">
            {[
              [AtSign, person.email, person.email ? `mailto:${person.email}` : null],
              [Phone, person.phone, person.phone ? `tel:${person.phone.replace(/\s/g, "")}` : null],
              [Globe, person.website, person.website ? (person.website.startsWith("http") ? person.website : `https://${person.website}`) : null],
              [Link2, person.linkedin_url?.replace("https://www.", ""), person.linkedin_url],
            ]
              .filter(([, v]) => v)
              .map(([Icon, v, href]) => {
                const I = Icon as typeof AtSign;
                return (
                  <a key={String(v)} href={String(href)} target={String(href).startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex min-h-11 items-center gap-3 break-all hover:text-accent">
                    <I size={18} className="shrink-0 text-muted" aria-hidden /> {String(v)}
                  </a>
                );
              })}
            {!person.email && !person.phone && !person.website && !person.linkedin_url && <p className="text-muted">No contact details yet.</p>}
          </Card>
          <p className="mt-3 text-[12px] text-dim">
            Added {relativeTime(person.created_at)} · Source: {person.consent_basis ? CONSENT_LABELS[person.consent_basis] : "typed by you"}
            {person.followup_due && !person.followed_up_at ? ` · Follow up ${shortDate(person.followup_due)}` : ""}
          </p>
        </section>

        <PersonActions id={id} followedUp={Boolean(person.followed_up_at)} name={person.full_name} />
      </main>
    </>
  );
}

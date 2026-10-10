import { notFound } from "next/navigation";
import { Sparkles, Briefcase, MessageSquareText, Lightbulb, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/server-page";
import { ButtonLink, Card, Chip, TopBar } from "@/components/ui";
import type { NormalizedProfile } from "@/lib/types";

const FIELD_LABEL: Record<string, string> = {
  headline: "headline",
  about: "about section",
  location: "location",
  company: "company",
  role: "role",
  experience: "experience",
  education: "education",
  skills: "skills",
  recentPosts: "recent posts",
};

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] text-dim">{children}</p>;
}

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { repo } = await requireUser();
  const person = await repo.getPerson(id);
  if (!person) notFound();
  const p: NormalizedProfile = person.raw_enrichment ?? {};
  const brief = person.brief;
  const experience = (p.experience ?? []).filter((e) => e.title || e.company);
  const posts = (p.recentPosts ?? []).filter((x) => x.text);

  return (
    <>
      <TopBar back={`/people/${id}`} title="Profile brief" />
      <main className="px-6 pb-12">
        <h1 className="text-[30px] font-extrabold leading-tight">{person.full_name ?? "Profile brief"}</h1>
        {p.headline && <p className="mt-1 text-muted">{p.headline}</p>}

        <section className="mt-6" aria-labelledby="in-short">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="in-short" className="inline-flex items-center gap-2 text-[18px] font-bold">
              <Sparkles size={18} className="text-accent" aria-hidden /> In short
            </h2>
            <Chip tone="muted" className="h-6 text-[12px]">written by AI</Chip>
          </div>
          <Card>{brief?.in_short ? <p className="text-[15px] leading-relaxed">{brief.in_short}</p> : <Empty>Not enough on their public profile to summarise.</Empty>}</Card>
        </section>

        <section className="mt-6" aria-labelledby="exp">
          <h2 id="exp" className="mb-2 inline-flex items-center gap-2 text-[18px] font-bold">
            <Briefcase size={18} className="text-muted" aria-hidden /> Experience
          </h2>
          <Card className="space-y-4">
            {experience.length ? (
              experience.map((e, i) => (
                <div key={i}>
                  <p className="text-[15px] font-semibold">{e.title ?? "Role not shown"}</p>
                  <p className="text-[14px] text-muted">{[e.company, e.start || e.end ? `${e.start ?? "?"} – ${e.end ?? "now"}` : null].filter(Boolean).join(" · ")}</p>
                </div>
              ))
            ) : (
              <Empty>Their public profile doesn&apos;t show experience.</Empty>
            )}
          </Card>
        </section>

        <section className="mt-6" aria-labelledby="posts">
          <h2 id="posts" className="mb-2 inline-flex items-center gap-2 text-[18px] font-bold">
            <MessageSquareText size={18} className="text-muted" aria-hidden /> Recent posts
          </h2>
          <Card className="space-y-4">
            {posts.length ? (
              posts.map((x, i) => (
                <div key={i}>
                  <p className="text-[15px] leading-relaxed">{x.text}</p>
                  <p className="mt-1 flex items-center gap-3 text-[13px] text-dim">
                    {x.date && <span>{new Date(x.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                    {x.url && (
                      <a href={x.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 hover:text-ink">
                        Open <ExternalLink size={13} aria-hidden />
                      </a>
                    )}
                  </p>
                </div>
              ))
            ) : (
              <Empty>No recent public posts found.</Empty>
            )}
          </Card>
        </section>

        <section className="mt-6" aria-labelledby="starters">
          <h2 id="starters" className="mb-2 inline-flex items-center gap-2 text-[18px] font-bold">
            <Lightbulb size={18} className="text-muted" aria-hidden /> Conversation starters
          </h2>
          <Card className="space-y-4">
            {brief?.starters?.length ? (
              brief.starters.map((s, i) => (
                <div key={i}>
                  <p className="text-[15px] leading-relaxed">{s.text}</p>
                  <p className="mt-1 text-[12px] text-dim">Based on their {FIELD_LABEL[s.source_field] ?? s.source_field}</p>
                </div>
              ))
            ) : (
              <Empty>Nothing to suggest from what their profile shows.</Empty>
            )}
          </Card>
        </section>

        <p className="mt-8 text-[13px] leading-relaxed text-dim">
          Built only from what their public profile shows, so a section can be empty. AI can be wrong, so check before you use it.
        </p>
        {person.linkedin_url && (
          <ButtonLink href={`/connect/${id}/note?ai=1`} className="mt-6">
            Use in my note
          </ButtonLink>
        )}
      </main>
    </>
  );
}

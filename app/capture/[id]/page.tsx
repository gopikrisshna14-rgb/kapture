"use client";
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { ButtonLink, TopBar, cx } from "@/components/ui";
import { usePerson } from "@/lib/use-person";
import type { EnrichmentStep } from "@/lib/types";

const DONE: Record<EnrichmentStep, number> = { qr_read: 1, profile_found: 2, reading: 2, writing_brief: 3, done: 4 };

export default function Loading({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { person, error } = usePerson(id);

  useEffect(() => {
    if (!person || person.enrichment_status === "pending") return;
    const to = person.enrichment_status === "failed" ? `/capture/${id}/failed` : `/capture/${id}/review`;
    const t = setTimeout(() => router.replace(to), 500);
    return () => clearTimeout(t);
  }, [person, id, router]);

  if (error) return <main className="p-6 text-muted">This person isn&apos;t here anymore.</main>;

  const done = person ? DONE[person.enrichment_step ?? "qr_read"] : 0;
  const first = person?.source === "linkedin_qr" ? "QR code read" : "Link read";
  const steps = [first, "Profile found", "Reading experience and recent posts", "Writing the brief"];

  return (
    <>
      <TopBar back="/people" />
      <main className="px-6 pb-10">
        <h1 className="text-[34px] font-extrabold leading-[1.05]">Filling in their profile…</h1>
        <p className="mt-2 text-muted">You can carry on. Details appear as they arrive.</p>
        <ol className="mt-8 space-y-3" aria-live="polite">
          {steps.map((s, i) => {
            const state = i < done ? "done" : i === done ? "active" : "todo";
            return (
              <li key={s} className={cx("flex items-center gap-4 rounded-[20px] border border-line bg-surface p-4", state === "todo" && "opacity-50")}>
                <span
                  className={cx(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    state === "done" ? "bg-accent text-on-accent" : "bg-surface-2 text-muted",
                  )}
                >
                  {state === "done" ? <Check size={18} aria-hidden /> : state === "active" ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <span className="h-2 w-2 rounded-full bg-dim" />}
                </span>
                <span className="text-[16px] font-medium">{s}</span>
                <span className="sr-only">{state === "done" ? "done" : state === "active" ? "in progress" : "waiting"}</span>
              </li>
            );
          })}
        </ol>
        <ButtonLink href={`/capture/${id}/review`} variant="secondary" className="mt-10">
          Continue to review
        </ButtonLink>
      </main>
    </>
  );
}

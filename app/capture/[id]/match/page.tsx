"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, CreditCard } from "lucide-react";
import { Avatar, Button, Chip, TopBar, cx } from "@/components/ui";
import { usePerson } from "@/lib/use-person";
import { api } from "@/lib/client";
import type { Candidate } from "@/lib/types";

type C = Candidate & { reasons: { name: boolean; company: boolean; city: boolean }; strong: boolean };

export default function Match({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { person } = usePerson(id, false);
  const [cands, setCands] = useState<C[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ candidates: C[] }>(`/api/people/${id}/candidates`)
      .then((d) => setCands(d.candidates))
      .catch(() => setCands([]));
  }, [id]);

  useEffect(() => {
    if (cands && cands.length === 0) router.replace(`/capture/${id}/review`);
  }, [cands, id, router]);

  const c = cands?.[0];

  async function yes() {
    if (!c) return;
    setBusy(true);
    await api(`/api/people/${id}/match`, "POST", { linkedin_url: c.linkedinUrl });
    router.replace(`/capture/${id}`);
  }

  return (
    <>
      <TopBar back={`/capture/${id}/review`} title="Likely match" />
      <main className="px-6 pb-12">
        {!c ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted" role="status">
            <Loader2 className="animate-spin" aria-hidden /> Looking for their LinkedIn profile…
          </div>
        ) : (
          <>
            <h1 className="text-[32px] font-extrabold leading-[1.05]">Is this them?</h1>
            <p className="mt-2 text-muted">We found a public profile that might match the card. Only link it if you&apos;re sure.</p>

            <div className="mt-6 grid gap-3">
              <div className="rounded-[22px] border border-line bg-surface p-4">
                <p className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-dim">
                  <CreditCard size={14} aria-hidden /> From the card
                </p>
                <p className="text-[17px] font-semibold">{person?.full_name}</p>
                <p className="text-[14px] text-muted">{[person?.role_title, person?.company].filter(Boolean).join(", ") || "No company on card"}</p>
                {person?.location && <p className="text-[14px] text-muted">{person.location}</p>}
              </div>
              <div className={cx("rounded-[22px] border bg-surface p-4", c.strong ? "border-accent" : "border-line")}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-dim">LinkedIn profile</p>
                  {c.strong ? <Chip tone="accent">Strong match</Chip> : <Chip tone="muted">Possible match</Chip>}
                </div>
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} src={c.photoUrl} size={44} />
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold">{c.name ?? "Unknown name"}</p>
                    <p className="truncate text-[14px] text-muted">{c.headline ?? c.company ?? "No headline shown"}</p>
                    {c.location && <p className="text-[14px] text-muted">{c.location}</p>}
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5" aria-label="Match reasons">
                  {(
                    [
                      ["name", "Name"],
                      ["company", "Company"],
                      ["city", "City"],
                    ] as const
                  ).map(([k, l]) => (
                    <li key={k} className="flex items-center gap-2 text-[14px]">
                      {c.reasons[k] ? <Check size={16} className="text-accent" aria-hidden /> : <X size={16} className="text-dim" aria-hidden />}
                      <span className={c.reasons[k] ? "text-ink" : "text-muted"}>
                        {l} {c.reasons[k] ? "matches" : "doesn't match or isn't shown"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <Button onClick={yes} disabled={busy}>Yes, that&apos;s them</Button>
              <Button variant="secondary" onClick={() => router.replace(`/capture/${id}/review`)} disabled={busy}>
                Not them, keep card details only
              </Button>
            </div>
          </>
        )}
      </main>
    </>
  );
}

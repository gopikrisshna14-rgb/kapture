"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, ShieldCheck } from "lucide-react";
import { Button, ButtonLink, TopBar } from "@/components/ui";
import { usePerson } from "@/lib/use-person";
import { api } from "@/lib/client";

export default function Failed({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { person } = usePerson(id, false);
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    await api(`/api/people/${id}/retry`, "POST").catch(() => null);
    router.replace(`/capture/${id}`);
  }
  async function moveOn() {
    setBusy(true);
    await api(`/api/people/${id}/save`, "POST", { queue: false }).catch(() => null);
    router.replace("/people");
    router.refresh();
  }

  return (
    <>
      <TopBar back="/people" />
      <main className="px-6 pb-12">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-accent">
          <ShieldCheck size={26} aria-hidden />
        </span>
        <h1 className="mt-5 text-[32px] font-extrabold leading-[1.05]">We couldn&apos;t read their profile. Nothing is lost.</h1>
        <p className="mt-3 text-muted">The profile may be private, or LinkedIn didn&apos;t answer in time. Here&apos;s what&apos;s saved:</p>
        <div className="mt-6 flex items-center gap-3 rounded-[22px] border border-line bg-surface p-4">
          <Link2 size={20} className="shrink-0 text-muted" aria-hidden />
          <span className="min-w-0 break-all text-[15px]">{person?.linkedin_url ?? person?.website ?? "…"}</span>
        </div>
        <div className="mt-8 space-y-3">
          <ButtonLink href={`/capture/${id}/review`}>Add details myself</ButtonLink>
          <Button variant="secondary" onClick={retry} disabled={busy}>Try again</Button>
          <Button variant="ghost" onClick={moveOn} disabled={busy}>Save the link and move on</Button>
        </div>
      </main>
    </>
  );
}

"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Search, ChevronDown, Plus, ScanLine, Check, Loader2 } from "lucide-react";
import { Avatar, ButtonLink, Chip, cx } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { LABEL_SETS } from "@/lib/labels";
import { relativeTime } from "@/lib/format";
import { api } from "@/lib/client";
import { SampleButton } from "@/components/sample-button";
import type { Priority, Purpose, EnrichmentStatus, ConnectStatus } from "@/lib/types";

export interface Row {
  id: string;
  full_name: string | null;
  role_title: string | null;
  company: string | null;
  headline: string | null;
  priority: Priority;
  created_at: string;
  enrichment_status: EnrichmentStatus;
  linkedin_url: string | null;
  website: string | null;
  followup_due: string | null;
  followed_up_at: string | null;
  connect: ConnectStatus | null;
}

export function PeopleList({
  people,
  events,
  currentEventId,
  purpose,
  used,
  limit,
  demo,
}: {
  people: Row[];
  events: { id: string; name: string; event_date: string }[];
  currentEventId: string | null;
  purpose: Purpose;
  used: number;
  limit: number;
  demo: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [switcher, setSwitcher] = useState(false);
  const labels = LABEL_SETS[purpose];
  const current = events.find((e) => e.id === currentEventId);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return people;
    return people.filter((p) => [p.full_name, p.company, p.role_title, p.headline].some((v) => v?.toLowerCase().includes(s)));
  }, [people, q]);

  const stats = {
    met: people.length,
    priority: people.filter((p) => p.priority === "priority").length,
    follow: people.filter((p) => p.followup_due && !p.followed_up_at).length,
  };

  async function switchTo(id: string) {
    await api("/api/profile", "PATCH", { current_event_id: id });
    setSwitcher(false);
    router.refresh();
  }

  const pct = Math.min(100, Math.round((used / limit) * 100));

  return (
    <main className="px-5 pt-[max(env(safe-area-inset-top),16px)]">
      <div className="flex h-14 items-center justify-between">
        <button
          type="button"
          onClick={() => setSwitcher(true)}
          className="inline-flex h-11 max-w-[70%] items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-[14px] font-semibold"
          aria-haspopup="dialog"
        >
          <span className="truncate">{current?.name ?? "Pick an event"}</span>
          <ChevronDown size={16} aria-hidden />
        </button>
        <Link href="/export" aria-label="Export" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface">
          <Download size={20} aria-hidden />
        </Link>
      </div>

      <h1 className="mt-3 text-[40px] font-extrabold leading-none">People</h1>

      <dl className="mt-5 grid grid-cols-3 gap-2">
        {[
          ["Met", stats.met],
          [labels.priority, stats.priority],
          ["To follow up", stats.follow],
        ].map(([l, n]) => (
          <div key={l} className="rounded-[20px] border border-line bg-surface p-3">
            <dt className="text-[12px] text-muted">{l}</dt>
            <dd className="font-display text-[28px] font-extrabold leading-tight">{n}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 rounded-[20px] border border-line bg-surface p-3">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted">
            <span className="font-semibold text-ink">{used}</span> of {limit} captures used this month
          </span>
          <Link href="/account/plans" className="inline-flex min-h-11 items-center font-semibold text-accent">Plans</Link>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit} aria-label="Captures used">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {people.length > 0 && (
        <div className="relative mt-4">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dim" aria-hidden />
          <label htmlFor="search" className="sr-only">Search people</label>
          <input
            id="search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or company"
            className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-[16px] text-ink focus:border-accent focus:outline-none"
          />
        </div>
      )}

      {people.length === 0 ? (
        <div className="mt-8 rounded-[24px] border border-dashed border-line p-8 text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent">
            <ScanLine size={26} aria-hidden />
          </span>
          <h2 className="mt-4 text-[22px] font-bold">No one here yet.</h2>
          <p className="mt-1 text-muted">Scan someone&apos;s LinkedIn code or card to catch them.</p>
          <ButtonLink href="/scan" className="mt-6">Scan someone</ButtonLink>
          {demo && <SampleButton className="mt-3" />}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line" aria-label="People">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link href={`/people/${p.id}`} className="flex min-h-[72px] items-center gap-3 py-3">
                <Avatar name={p.full_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-semibold">{p.full_name ?? (p.linkedin_url || p.website ? "Saved link" : "Unnamed")}</p>
                  <p className="truncate text-[14px] text-muted">
                    {[p.role_title, p.company].filter(Boolean).join(" at ") || p.headline || (p.enrichment_status === "failed" ? "Profile couldn't be read" : " ")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Chip tone={p.priority === "priority" ? "accent" : "default"} className="h-6 px-2.5 text-[12px]">
                    {labels[p.priority]}
                  </Chip>
                  <span className="inline-flex items-center gap-1 text-[12px] text-dim">
                    {p.enrichment_status === "pending" && <Loader2 size={12} className="animate-spin" aria-label="Filling in" />}
                    {p.connect === "sent" || p.connect === "accepted" ? <Check size={12} aria-label="Request sent" /> : null}
                    {relativeTime(p.created_at)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
          {filtered.length === 0 && <li className="py-8 text-center text-muted">No one matches &ldquo;{q}&rdquo;.</li>}
        </ul>
      )}

      <Sheet open={switcher} onClose={() => setSwitcher(false)} title="Your events">
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => switchTo(e.id)}
                className={cx(
                  "flex min-h-14 w-full items-center justify-between rounded-[18px] border px-4 text-left",
                  e.id === currentEventId ? "border-accent bg-surface-2" : "border-line bg-surface-2/40",
                )}
              >
                <span>
                  <span className="block text-[15px] font-semibold">{e.name}</span>
                  <span className="block text-[13px] text-muted">{new Date(e.event_date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                </span>
                {e.id === currentEventId && <Check size={18} className="text-accent" aria-label="Current" />}
              </button>
            </li>
          ))}
        </ul>
        <ButtonLink href="/events/new" variant="secondary" className="mt-4">
          <Plus size={18} aria-hidden /> New event
        </ButtonLink>
      </Sheet>
    </main>
  );
}

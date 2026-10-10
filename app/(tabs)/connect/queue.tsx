"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, NotebookPen, Check, Loader2 } from "lucide-react";
import { Avatar, ButtonLink, Chip, cx } from "@/components/ui";
import { api } from "@/lib/client";
import { CONNECT_LABELS } from "@/lib/labels";
import type { ConnectRequest, ConnectStatus } from "@/lib/types";

type Row = ConnectRequest & { full_name: string | null; company: string | null; role_title: string | null; linkedin_url: string | null };

export function ConnectQueue() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<ConnectStatus | "all">("all");
  const load = () => api<Row[]>("/api/connect").then(setRows).catch(() => setRows([]));
  useEffect(() => {
    load();
  }, []);

  const count = (s: ConnectStatus) => rows?.filter((r) => r.status === s).length ?? 0;
  const queued = rows?.filter((r) => r.status === "queued" && r.linkedin_url) ?? [];
  const shown = (rows ?? []).filter((r) => filter === "all" || r.status === filter);

  async function accepted(r: Row) {
    await api(`/api/connect/${r.person_id}`, "PUT", { status: "accepted" });
    load();
  }

  return (
    <main className="px-5 pt-[max(env(safe-area-inset-top),16px)]">
      <div className="flex h-14 items-center justify-end">
        <Link href="/connect/notes" className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[14px] font-semibold">
          <NotebookPen size={18} aria-hidden /> Saved notes
        </Link>
      </div>
      <h1 className="mt-3 text-[40px] font-extrabold leading-none">Connect</h1>
      <p className="mt-2 text-muted">Catch writes the note. You send it in LinkedIn.</p>

      <div className="mt-5 grid grid-cols-3 gap-2" role="group" aria-label="Filter by status">
        {(["queued", "sent", "accepted"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filter === s}
            onClick={() => setFilter(filter === s ? "all" : s)}
            className={cx("rounded-[20px] border p-3 text-left", filter === s ? "border-accent bg-surface-2" : "border-line bg-surface")}
          >
            <span className="block text-[12px] text-muted">{CONNECT_LABELS[s]}</span>
            <span className="block font-display text-[28px] font-extrabold leading-tight">{count(s)}</span>
          </button>
        ))}
      </div>

      {queued.length > 0 && (
        <div className="mt-4 space-y-2">
          <ButtonLink href={`/connect/${queued[queued.length - 1].person_id}/note?queue=1`}>
            <Send size={18} aria-hidden /> Send your queue of {queued.length}
          </ButtonLink>
          <a href="#queue-list" className="flex h-11 items-center justify-center text-[14px] text-muted hover:text-ink">
            Or go one by one in LinkedIn
          </a>
        </div>
      )}

      {rows === null ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted" aria-label="Loading" /></div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-[24px] border border-dashed border-line p-8 text-center">
          <h2 className="text-[20px] font-bold">Your queue is empty.</h2>
          <p className="mt-1 text-muted">When you save someone, keep &ldquo;Add to connect queue&rdquo; on and they&apos;ll show up here.</p>
        </div>
      ) : (
        <ul id="queue-list" className="mt-4 divide-y divide-line" aria-label="Connection requests">
          {shown.map((r) => (
            <li key={r.id} className="flex min-h-[72px] items-center gap-3 py-3">
              <Link href={r.linkedin_url ? `/connect/${r.person_id}/note` : `/people/${r.person_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={r.full_name} />
                <span className="min-w-0">
                  <span className="block truncate text-[16px] font-semibold">{r.full_name ?? "Unnamed"}</span>
                  <span className="block truncate text-[14px] text-muted">{r.linkedin_url ? ([r.role_title, r.company].filter(Boolean).join(" at ") || " ") : "No LinkedIn profile yet"}</span>
                </span>
              </Link>
              {r.status === "sent" ? (
                <button type="button" onClick={() => accepted(r)} className="inline-flex h-11 items-center gap-1 rounded-full border border-line px-3 text-[13px] font-semibold hover:bg-surface">
                  <Check size={14} aria-hidden /> Accepted?
                </button>
              ) : (
                <Chip tone={r.status === "accepted" ? "accent" : "default"}>{CONNECT_LABELS[r.status]}</Chip>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, CreditCard, UserRound, Keyboard, Search, Trash2, Download } from "lucide-react";
import { Button, Card, SectionLabel, Switch, TopBar } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { api } from "@/lib/client";

export function PrivacyScreen({
  counts,
  autoDelete,
  people,
}: {
  counts: { public_profile: number; card_given: number; self_submitted: number; typed: number };
  autoDelete: boolean;
  people: { id: string; full_name: string | null; company: string | null }[];
}) {
  const router = useRouter();
  const [auto, setAuto] = useState(autoDelete);
  const [q, setQ] = useState("");
  const [list, setList] = useState(people);
  const [del, setDel] = useState<{ id: string; full_name: string | null } | null>(null);
  const [msg, setMsg] = useState("");

  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? list.filter((p) => [p.full_name, p.company].some((v) => v?.toLowerCase().includes(s))).slice(0, 8) : [];
  }, [q, list]);

  async function toggle(v: boolean) {
    setAuto(v);
    await api("/api/privacy/auto-delete", "POST", { enabled: v });
    router.refresh();
  }
  async function confirmDelete() {
    if (!del) return;
    await api(`/api/people/${del.id}`, "DELETE");
    setList(list.filter((p) => p.id !== del.id));
    setMsg(`${del.full_name ?? "That person"} was deleted.`);
    setDel(null);
    setQ("");
    router.refresh();
  }

  const sources = [
    [Globe, "Public LinkedIn profile", counts.public_profile],
    [CreditCard, "Business card they gave you", counts.card_given],
    [UserRound, "Typed by them on your Catch page", counts.self_submitted],
    [Keyboard, "Typed by you", counts.typed],
  ] as const;

  return (
    <>
      <TopBar back="/account" title="Data and privacy" />
      <main className="px-6 pb-12">
        <h1 className="text-[34px] font-extrabold leading-tight">Data and privacy</h1>

        <section className="mt-6">
          <SectionLabel>Where details come from</SectionLabel>
          <Card className="space-y-1 p-2">
            {sources.map(([I, l, n]) => (
              <div key={l} className="flex min-h-12 items-center gap-3 px-2">
                <I size={18} className="text-muted" aria-hidden />
                <span className="flex-1 text-[15px]">{l}</span>
                <span className="font-display text-[18px] font-bold">{n}</span>
              </div>
            ))}
          </Card>
          <p className="mt-2 text-[13px] text-dim">Each person shows their source on their page.</p>
        </section>

        <section className="mt-6">
          <SectionLabel>Find a person and delete them</SectionLabel>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dim" aria-hidden />
            <label htmlFor="find" className="sr-only">Find a person</label>
            <input
              id="find"
              type="search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setMsg(""); }}
              placeholder="Name or company"
              className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-[16px] focus:border-accent focus:outline-none"
            />
          </div>
          {found.length > 0 && (
            <ul className="mt-2 divide-y divide-line rounded-[20px] border border-line bg-surface">
              {found.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{p.full_name ?? "Unnamed"}</span>
                    {p.company && <span className="block truncate text-[13px] text-muted">{p.company}</span>}
                  </span>
                  <button type="button" onClick={() => setDel(p)} className="inline-flex h-11 items-center gap-1 rounded-full border border-line px-3 text-[13px] font-semibold text-danger" aria-label={`Delete ${p.full_name ?? "person"}`}>
                    <Trash2 size={14} aria-hidden /> Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q && found.length === 0 && <p className="mt-2 text-[14px] text-muted">No one matches.</p>}
          {msg && <p role="status" className="mt-2 text-[14px] text-accent">{msg}</p>}
        </section>

        <section className="mt-6">
          <Card className="px-4 py-2">
            <Switch checked={auto} onChange={toggle} label="Delete people after 12 months" description="Each person is removed for good 12 months after you caught them." />
          </Card>
        </section>

        <a href="/api/export/all" download className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border border-line bg-surface text-[16px] font-semibold hover:bg-surface-2">
          <Download size={18} aria-hidden /> Export all my data
        </a>

        <p className="mt-8 text-[13px] leading-relaxed text-dim">
          You decide why you keep each person&apos;s details. Catch gives you the tools to delete them.
        </p>
      </main>

      <Sheet open={del !== null} onClose={() => setDel(null)} title="Delete for good?">
        <p className="text-muted">
          {del?.full_name ?? "This person"}&apos;s details, notes, voice note, photo and cached profile data will be removed. This can&apos;t be undone.
        </p>
        <div className="mt-6 space-y-3">
          <Button variant="danger" onClick={confirmDelete}>Delete permanently</Button>
          <Button variant="secondary" onClick={() => setDel(null)}>Keep</Button>
        </div>
      </Sheet>
    </>
  );
}

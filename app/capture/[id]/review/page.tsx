"use client";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Bell } from "lucide-react";
import { Avatar, Button, ChoiceChip, Field, Switch, TopBar, SectionLabel } from "@/components/ui";
import { SourceChip } from "@/components/source-chip";
import { VoiceNote } from "@/components/voice-note";
import { usePerson } from "@/lib/use-person";
import { useMe } from "@/lib/use-me";
import { api } from "@/lib/client";
import { LABEL_SETS, PRIORITY_ORDER } from "@/lib/labels";
import { addDaysIso, shortDate } from "@/lib/format";
import type { Priority } from "@/lib/types";

const FIELDS = [
  ["full_name", "Name", "name"],
  ["role_title", "Role", "organization-title"],
  ["company", "Company", "organization"],
  ["location", "Location", "off"],
  ["email", "Email", "off"],
  ["phone", "Phone", "off"],
] as const;
type FieldKey = (typeof FIELDS)[number][0];

export default function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { person } = usePerson(id);
  const me = useMe();
  const [form, setForm] = useState<Record<FieldKey, string>>({ full_name: "", role_title: "", company: "", location: "", email: "", phone: "" });
  const dirty = useRef(new Set<FieldKey>());
  const [priority, setPriority] = useState<Priority>("just_met");
  const [transcript, setTranscript] = useState("");
  const [due, setDue] = useState<string | null>(null);
  const [queue, setQueue] = useState(true);
  const [busy, setBusy] = useState<null | "save" | "connect">(null);
  const [err, setErr] = useState("");
  const initialised = useRef(false);

  // Fields arrive while enrichment runs; never overwrite what the user already typed.
  useEffect(() => {
    if (!person) return;
    setForm((f) => {
      const next = { ...f };
      for (const [k] of FIELDS) if (!dirty.current.has(k)) next[k] = (person[k] as string | null) ?? "";
      return next;
    });
    if (!initialised.current) {
      initialised.current = true;
      setPriority(person.priority);
      setTranscript(person.voice_transcript ?? "");
      setDue(person.followup_due);
    }
  }, [person]);

  if (!person) return <main className="flex min-h-dvh items-center justify-center"><Loader2 className="animate-spin text-muted" aria-label="Loading" /></main>;

  const labels = LABEL_SETS[me?.profile.purpose ?? "selling"];
  const pending = person.enrichment_status === "pending";
  const delay = me?.event?.followup_delay_days ?? 2;
  const dueOptions: [string, string | null][] = [
    ["Tomorrow", addDaysIso(1)],
    ["In 2 days", addDaysIso(2)],
    ["In a week", addDaysIso(7)],
    ["No reminder", null],
  ];

  async function save(connect: boolean) {
    setBusy(connect ? "connect" : "save");
    setErr("");
    let ms: number | null = null;
    try {
      const s = Number(sessionStorage.getItem("catch_capture_start"));
      if (s) ms = Date.now() - s;
      sessionStorage.removeItem("catch_capture_start");
    } catch {}
    try {
      await api(`/api/people/${id}/save`, "POST", {
        ...form,
        priority,
        voice_transcript: transcript,
        followup_due: due,
        queue: connect ? true : queue,
        first_save: ms !== null,
        ms_from_start: ms,
      });
      router.replace(connect ? `/connect/${id}/note` : "/people");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <>
      <TopBar back="/people" title="Review" />
      <main className="px-6 pb-12">
        <div className="rounded-[24px] border border-line bg-surface p-5">
          <div className="flex items-center gap-4">
            <Avatar name={form.full_name || person.full_name} src={person.photo_url} size={56} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[22px] font-bold leading-tight">{form.full_name || (pending ? "Reading profile…" : "New person")}</p>
              <p className="truncate text-[14px] text-muted">{[form.role_title, form.company].filter(Boolean).join(" at ") || person.headline || " "}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SourceChip source={person.source} />
            {pending && (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-muted" role="status">
                <Loader2 size={14} className="animate-spin" aria-hidden /> Filling in
              </span>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {FIELDS.map(([k, label, ac]) => (
              <Field
                key={k}
                id={`f-${k}`}
                label={label}
                autoComplete={ac}
                type={k === "email" ? "email" : k === "phone" ? "tel" : "text"}
                value={form[k]}
                placeholder={pending && !form[k] ? "…" : "Not on record"}
                onChange={(e) => {
                  dirty.current.add(k);
                  setForm({ ...form, [k]: e.target.value });
                }}
              />
            ))}
          </div>
        </div>

        <section className="mt-6" aria-labelledby="prio">
          <SectionLabel><span id="prio">Priority</span></SectionLabel>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="prio">
            {PRIORITY_ORDER.map((p) => (
              <ChoiceChip key={p} role="radio" aria-checked={priority === p} selected={priority === p} onClick={() => setPriority(p)}>
                {labels[p]}
              </ChoiceChip>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <SectionLabel>Voice note</SectionLabel>
          <VoiceNote value={transcript} onChange={setTranscript} />
        </section>

        <section className="mt-6">
          <SectionLabel>Reminder</SectionLabel>
          <div className="rounded-[22px] border border-line bg-surface p-4">
            <p className="flex items-center gap-2 text-[15px]">
              <Bell size={18} className="text-muted" aria-hidden />
              {due ? <>Follow up on <span className="font-semibold">{shortDate(due)}</span></> : "No reminder"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dueOptions.map(([l, d]) => (
                <ChoiceChip key={l} selected={due === d} onClick={() => setDue(d)} className="h-11 text-[14px]">
                  {l}
                </ChoiceChip>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-dim">Event default: {delay === 1 ? "next day" : delay === 7 ? "in a week" : `in ${delay} days`}.</p>
          </div>
        </section>

        <div className="mt-6 rounded-[22px] border border-line bg-surface px-4 py-2">
          <Switch checked={queue} onChange={setQueue} label="Add to connect queue" description="Send them a LinkedIn note later." />
        </div>

        {err && <p role="alert" className="mt-4 text-[14px] text-danger">{err}</p>}
        <div className="mt-8 space-y-3">
          <Button onClick={() => save(false)} disabled={Boolean(busy)}>
            {busy === "save" ? <Loader2 size={18} className="animate-spin" aria-hidden /> : null} Save
          </Button>
          <Button variant="secondary" onClick={() => save(true)} disabled={Boolean(busy)}>
            {busy === "connect" ? <Loader2 size={18} className="animate-spin" aria-hidden /> : null} Save and connect now
          </Button>
        </div>
      </main>
    </>
  );
}

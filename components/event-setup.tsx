"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ChoiceChip, TopBar } from "@/components/ui";
import { EventSearch, type EventChoice, type PastEvent } from "@/components/event-search";
import { PURPOSES, LABEL_SETS } from "@/lib/labels";
import { api } from "@/lib/client";
import type { Purpose } from "@/lib/types";

const iso = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

export function EventSetup({ purpose: initialPurpose, back, past = [] }: { purpose: Purpose; back: string; past?: PastEvent[] }) {
  const router = useRouter();
  const today = iso(new Date());
  const tomorrow = iso(new Date(Date.now() + 86400000));
  const [purpose, setPurpose] = useState<Purpose>(initialPurpose);
  const [name, setName] = useState("");
  const [existing, setExisting] = useState<PastEvent | null>(null);
  const [date, setDate] = useState(today);
  const [pick, setPick] = useState(false);
  const [delay, setDelay] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Search for your event, or type its name.");
    setBusy(true);
    try {
      if (existing) {
        // One of your own events: switch back to it instead of creating a duplicate.
        await api("/api/profile", "PATCH", { current_event_id: existing.id, purpose });
      } else {
        await api("/api/events", "POST", { name, event_date: date, followup_delay_days: delay, purpose });
      }
      router.push("/people");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const labels = LABEL_SETS[purpose];
  return (
    <>
      <TopBar back={back} />
      <form onSubmit={submit} className="px-6 pb-10">
        <h1 className="text-[34px] font-extrabold leading-[1.05]">Pick your event.</h1>
        <p className="mt-2 text-muted">Everyone you meet gets filed under it.</p>

        <fieldset className="mt-8">
          <legend className="mb-2 text-[13px] font-medium text-muted">Why are you there?</legend>
          <div className="flex flex-wrap gap-2">
            {PURPOSES.map((p) => (
              <ChoiceChip key={p.id} selected={purpose === p.id} onClick={() => setPurpose(p.id)}>
                {p.label}
              </ChoiceChip>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-dim">
            Labels: {labels.priority} / {labels.follow_up} / {labels.just_met}
          </p>
        </fieldset>

        <div className="mt-6">
          <EventSearch
            past={past}
            value={name}
            onChoose={(c: EventChoice) => {
              setErr("");
              if (c.kind === "past") {
                setExisting(c.event);
                setName(c.event.name);
                setDate(c.event.event_date);
              } else {
                setExisting(null);
                setName(c.kind === "fair" ? c.fair.name : c.name);
              }
            }}
          />
        </div>

        {!existing && (
        <>
        <fieldset className="mt-6">
          <legend className="mb-2 text-[13px] font-medium text-muted">Date</legend>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip selected={!pick && date === today} onClick={() => { setPick(false); setDate(today); }}>Today</ChoiceChip>
            <ChoiceChip selected={!pick && date === tomorrow} onClick={() => { setPick(false); setDate(tomorrow); }}>Tomorrow</ChoiceChip>
            <ChoiceChip selected={pick} onClick={() => setPick(true)}>Pick a date</ChoiceChip>
          </div>
          {pick && (
            <div className="mt-3">
              <label htmlFor="event-date" className="sr-only">Event date</label>
              <input
                id="event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-ink [color-scheme:dark]"
              />
            </div>
          )}
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mb-2 text-[13px] font-medium text-muted">Remind me to follow up</legend>
          <div className="flex flex-wrap gap-2">
            {[
              [1, "Next day"],
              [2, "In 2 days"],
              [7, "In a week"],
            ].map(([d, l]) => (
              <ChoiceChip key={d} selected={delay === d} onClick={() => setDelay(d as number)}>
                {l}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>

        </>
        )}

        {err && <p role="alert" className="mt-4 text-[14px] text-danger">{err}</p>}
        <Button type="submit" className="mt-10" disabled={busy}>
          {existing ? "Switch to this event" : "Start catching"}
        </Button>
      </form>
    </>
  );
}

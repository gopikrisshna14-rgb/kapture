"use client";
import { useId, useMemo, useRef, useState } from "react";
import { Search, Plus, History, MapPin } from "lucide-react";
import { cx } from "./ui";
import { fold, searchFairs, type Fair } from "@/lib/event-catalog";

export interface PastEvent {
  id: string;
  name: string;
  event_date: string;
}

export type EventChoice =
  | { kind: "fair"; fair: Fair }
  | { kind: "past"; event: PastEvent }
  | { kind: "custom"; name: string };

type Option = { key: string; choice: EventChoice };

/**
 * Accessible combobox: search the trade fair list (and your own past events);
 * if the event isn't listed, the last option adds what you typed as a new event.
 */
export function EventSearch({ past, value, onChoose }: { past: PastEvent[]; value: string; onChoose: (c: EventChoice) => void }) {
  const [q, setQ] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo<Option[]>(() => {
    const f = fold(q);
    const mine = (f ? past.filter((e) => fold(e.name).includes(f)) : past).slice(0, 3);
    const fairs = searchFairs(q, 6).filter((x) => !mine.some((m) => fold(m.name) === fold(x.name)));
    const out: Option[] = [
      ...mine.map((e) => ({ key: `past-${e.id}`, choice: { kind: "past", event: e } as EventChoice })),
      ...fairs.map((x) => ({ key: `fair-${x.name}`, choice: { kind: "fair", fair: x } as EventChoice })),
    ];
    const exact = out.some((o) => fold(o.choice.kind === "past" ? o.choice.event.name : o.choice.kind === "fair" ? o.choice.fair.name : "") === f);
    if (q.trim() && !exact) out.push({ key: "custom", choice: { kind: "custom", name: q.trim() } });
    return out;
  }, [q, past]);

  function choose(o: Option) {
    const c = o.choice;
    setQ(c.kind === "fair" ? c.fair.name : c.kind === "past" ? c.event.name : c.name);
    setOpen(false);
    onChoose(c);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && options[active]) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Escape") setOpen(false);
  }

  const showList = open && options.length > 0;

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="mb-1.5 block text-[13px] font-medium text-muted">
        Event
      </label>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dim" aria-hidden />
        <input
          ref={inputRef}
          id={`${id}-input`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={showList && options[active] ? `${id}-${options[active].key}` : undefined}
          autoComplete="off"
          placeholder="Search trade fairs, e.g. LogiMAT"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
            onChoose({ kind: "custom", name: e.target.value.trim() });
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
          className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-4 text-[16px] text-ink placeholder:text-dim focus:border-accent focus:outline-none"
        />
      </div>
      {showList && (
        <ul id={`${id}-list`} role="listbox" aria-label="Events" className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-[20px] border border-line bg-surface-2 p-1 shadow-2xl">
          {options.map((o, i) => {
            const c = o.choice;
            return (
              <li
                key={o.key}
                id={`${id}-${o.key}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                onMouseEnter={() => setActive(i)}
                className={cx("flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2", i === active && "bg-surface")}
              >
                {c.kind === "custom" ? (
                  <>
                    <Plus size={18} className="shrink-0 text-accent" aria-hidden />
                    <span className="text-[15px]">
                      Add <span className="font-semibold">&ldquo;{c.name}&rdquo;</span> as a new event
                    </span>
                  </>
                ) : c.kind === "past" ? (
                  <>
                    <History size={18} className="shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{c.event.name}</span>
                      <span className="block text-[12px] text-muted">Your event · {new Date(c.event.event_date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <MapPin size={18} className="shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{c.fair.name}</span>
                      <span className="block truncate text-[12px] text-muted">{c.fair.city} · {c.fair.industry}</span>
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-1.5 text-[13px] text-dim">Not listed? Type the name and add it.</p>
    </div>
  );
}

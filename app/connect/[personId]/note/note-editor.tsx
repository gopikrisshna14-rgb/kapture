"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check } from "lucide-react";
import { Button, ChoiceChip, TopBar, cx } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { api } from "@/lib/client";
import { clampNote, fillTemplate, friendlier, shorter, type NoteVars } from "@/lib/grounding";

interface T { id: string; name: string; body: string; is_default: boolean }

export function NoteEditor(props: {
  personId: string;
  name: string | null;
  linkedinUrl: string | null;
  templates: T[];
  vars: NoteVars;
  maxLength: number;
  savedNote: string | null;
  queueMode: boolean;
  autoAi: boolean;
  canAi: boolean;
}) {
  const router = useRouter();
  const def = props.templates.find((t) => t.is_default) ?? props.templates[0];
  const [tpl, setTpl] = useState(def?.id);
  const [note, setNote] = useState(props.savedNote ?? clampNote(fillTemplate(def?.body ?? "", props.vars), props.maxLength));
  const [aiLine, setAiLine] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const asked = useRef(false);

  async function addAi() {
    setAiBusy(true);
    try {
      const base = aiLine ? note.replace(" " + aiLine, "") : note;
      const { line } = await api<{ line: string | null }>(`/api/connect/${props.personId}/ai-line`, "POST", { base });
      if (line) {
        const next = `${base} ${line}`;
        if (next.length <= props.maxLength) {
          setNote(next);
          setAiLine(line);
        }
      } else setErr("Nothing on their profile or in your voice note to add.");
    } finally {
      setAiBusy(false);
    }
  }

  useEffect(() => {
    if (props.autoAi && !asked.current) {
      asked.current = true;
      addAi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyTemplate(t: T) {
    setTpl(t.id);
    setAiLine(null);
    setNote(clampNote(fillTemplate(t.body, props.vars), props.maxLength));
    setSheet(false);
  }

  const over = note.length > props.maxLength;

  async function next() {
    if (over || !note.trim()) return;
    setBusy(true);
    try {
      await api(`/api/connect/${props.personId}`, "PUT", { note });
      router.push(`/connect/${props.personId}/handoff${props.queueMode ? "?queue=1" : ""}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar back={props.queueMode ? "/connect" : `/people/${props.personId}`} title="Connection note" />
      <main className="px-6 pb-12">
        <h1 className="text-[30px] font-extrabold leading-tight">Note to {props.vars.first_name ?? props.name ?? "them"}</h1>
        <p className="mt-1 text-muted">LinkedIn shows this with your request.</p>

        {!props.linkedinUrl && (
          <p className="mt-4 rounded-2xl border border-line bg-surface p-3 text-[14px] text-muted">There&apos;s no LinkedIn profile saved for this person yet, so you can&apos;t send a request.</p>
        )}

        <div className={cx("mt-6 rounded-[22px] border bg-surface p-4", over ? "border-danger" : "border-line focus-within:border-accent")}>
          <label htmlFor="note" className="sr-only">Connection note</label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => { setNote(e.target.value); setErr(""); }}
            rows={6}
            className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink focus:outline-none"
            aria-describedby="note-count"
          />
          <div className="mt-2 flex items-center justify-between text-[13px]">
            <span className="text-dim">{aiLine ? <span className="inline-flex items-center gap-1"><Sparkles size={13} aria-hidden /> Last line by AI</span> : " "}</span>
            <span id="note-count" className={over ? "font-semibold text-danger" : "text-muted"} aria-live="polite">
              {note.length} / {props.maxLength}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <ChoiceChip onClick={() => setNote(clampNote(friendlier(note), props.maxLength))}>Friendlier</ChoiceChip>
          <ChoiceChip onClick={() => { setNote(shorter(note)); setAiLine(null); }}>Shorter</ChoiceChip>
          <ChoiceChip onClick={() => setSheet(true)}>Saved notes</ChoiceChip>
          {props.canAi && (
            <ChoiceChip onClick={addAi} disabled={aiBusy}>
              {aiBusy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Sparkles size={16} aria-hidden />} {aiLine ? "Another line" : "Add a line"}
            </ChoiceChip>
          )}
        </div>
        {props.canAi && <p className="mt-2 text-[12px] text-dim">AI lines use only their public profile and your voice note. Check before sending.</p>}

        {err && <p role="alert" className="mt-4 text-[14px] text-danger">{err}</p>}
        <Button className="mt-8" onClick={next} disabled={busy || over || !note.trim() || !props.linkedinUrl}>
          Next: send in LinkedIn
        </Button>
      </main>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Saved notes">
        <ul className="space-y-2">
          {props.templates.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => applyTemplate(t)} className={cx("w-full rounded-[18px] border p-4 text-left", tpl === t.id ? "border-accent" : "border-line")}>
                <span className="flex items-center justify-between text-[15px] font-semibold">
                  {t.name} {tpl === t.id && <Check size={16} className="text-accent" aria-label="In use" />}
                </span>
                <span className="mt-1 block text-[14px] text-muted">{fillTemplate(t.body, props.vars)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

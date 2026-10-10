"use client";
import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { Button, Field, Switch, TopBar, cx } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { api } from "@/lib/client";
import type { NoteTemplate } from "@/lib/types";

export function SavedNotes({ initial, aiOn, maxLength }: { initial: NoteTemplate[]; aiOn: boolean; maxLength: number }) {
  const [list, setList] = useState(initial);
  const [ai, setAi] = useState(aiOn);
  const [edit, setEdit] = useState<{ id?: string; name: string; body: string } | null>(null);
  const [err, setErr] = useState("");

  async function makeDefault(id: string) {
    await api(`/api/notes/${id}`, "PATCH", { is_default: true });
    setList(list.map((t) => ({ ...t, is_default: t.id === id })));
  }
  async function toggleAi(v: boolean) {
    setAi(v);
    await api("/api/profile", "PATCH", { ai_personalise: v });
  }
  async function save() {
    if (!edit) return;
    setErr("");
    try {
      if (edit.id) {
        const t = await api<NoteTemplate>(`/api/notes/${edit.id}`, "PATCH", { name: edit.name, body: edit.body });
        setList(list.map((x) => (x.id === t.id ? t : x)));
      } else {
        const t = await api<NoteTemplate>("/api/notes", "POST", { name: edit.name, body: edit.body });
        setList([...list, t]);
      }
      setEdit(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function del(id: string) {
    await api(`/api/notes/${id}`, "DELETE");
    setList(list.filter((t) => t.id !== id));
    setEdit(null);
  }

  return (
    <>
      <TopBar back="/connect" title="Saved notes" />
      <main className="px-6 pb-12">
        <h1 className="text-[30px] font-extrabold leading-tight">Saved connection notes</h1>
        <p className="mt-1 text-muted">Use {"{first_name}"}, {"{company}"} and {"{event}"}. Anything missing is left out.</p>

        <div role="radiogroup" aria-label="Default note" className="mt-6 space-y-3">
          {list.map((t) => (
            <div key={t.id} className={cx("rounded-[22px] border bg-surface p-4", t.is_default ? "border-accent" : "border-line")}>
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => setEdit({ id: t.id, name: t.name ?? "", body: t.body ?? "" })} className="min-h-11 flex-1 text-left text-[16px] font-semibold">
                  {t.name}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={t.is_default}
                  onClick={() => makeDefault(t.id)}
                  className={cx("inline-flex h-11 items-center gap-1 rounded-full px-3 text-[13px] font-semibold", t.is_default ? "bg-accent text-on-accent" : "border border-line text-muted")}
                >
                  {t.is_default ? <><Check size={14} aria-hidden /> Default</> : "Make default"}
                </button>
              </div>
              <p className="mt-1 text-[14px] text-muted">{t.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[22px] border border-line bg-surface px-4 py-2">
          <Switch checked={ai} onChange={toggleAi} label="Personalise with AI" description="Adds one line based on their public profile or your voice note." />
        </div>

        <Button variant="secondary" className="mt-6" onClick={() => setEdit({ name: "", body: "Hi {first_name}, " })}>
          <Plus size={18} aria-hidden /> New note
        </Button>
      </main>

      <Sheet open={edit !== null} onClose={() => setEdit(null)} title={edit?.id ? "Edit note" : "New note"}>
        {edit && (
          <div className="space-y-4">
            <Field id="tpl-name" label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Field id="tpl-body" label={`Note (${edit.body.length} characters, max ${maxLength} once filled in)`} multiline rows={4} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
            {err && <p role="alert" className="text-[14px] text-danger">{err}</p>}
            <Button onClick={save}>Save note</Button>
            {edit.id && (
              <Button variant="danger" size="md" className="w-full" onClick={() => del(edit.id!)}>
                <Trash2 size={18} aria-hidden /> Delete
              </Button>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

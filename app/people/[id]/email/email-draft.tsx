"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Copy, Check, Sparkles } from "lucide-react";
import { Button, ChoiceChip, Field, TopBar } from "@/components/ui";
import { api, track } from "@/lib/client";

type Tone = "friendly" | "direct" | "short";

export function EmailDraft({ id, to, firstName }: { id: string; to: string | null; firstName: string | null }) {
  const [tone, setTone] = useState<Tone>("friendly");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(true);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const draft = useCallback(
    async (t: Tone) => {
      setBusy(true);
      setErr("");
      try {
        const d = await api<{ subject: string; body: string }>(`/api/people/${id}/email`, "POST", { tone: t });
        setSubject(d.subject);
        setBody(d.body);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [id],
  );

  useEffect(() => {
    draft("friendly");
  }, [draft]);

  const mailto = `mailto:${to ? encodeURIComponent(to) : ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  function opened() {
    track("followup_email_opened", undefined, id);
    api(`/api/people/${id}`, "PATCH", { followed_up: true }).catch(() => {});
  }

  async function copy() {
    await navigator.clipboard.writeText(body).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <TopBar back={`/people/${id}`} title="Follow-up email" />
      <main className="px-6 pb-12">
        <h1 className="text-[30px] font-extrabold leading-tight">Follow up with {firstName ?? "them"}.</h1>
        <p className="mt-1 inline-flex items-center gap-1.5 text-[14px] text-muted">
          <Sparkles size={14} aria-hidden /> Drafted by AI from their brief and your voice note. Edit freely.
        </p>

        <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Tone">
          {(["friendly", "direct", "short"] as const).map((t) => (
            <ChoiceChip
              key={t}
              role="radio"
              aria-checked={tone === t}
              selected={tone === t}
              onClick={() => {
                setTone(t);
                draft(t);
              }}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </ChoiceChip>
          ))}
        </div>

        {busy ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
            <Loader2 className="animate-spin" aria-hidden /> Writing a draft…
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {!to && <p className="rounded-2xl border border-line bg-surface p-3 text-[14px] text-muted">No email address saved. You can add it in your email app.</p>}
            <Field id="subject" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Field id="body" label="Message" multiline rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        )}
        {err && <p role="alert" className="mt-4 text-[14px] text-danger">{err}</p>}

        <a
          href={mailto}
          onClick={opened}
          aria-disabled={busy}
          className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent text-[16px] font-semibold text-on-accent aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          <Mail size={18} aria-hidden /> Open in email app
        </a>
        <Button variant="secondary" className="mt-3" onClick={copy} disabled={busy}>
          {copied ? <><Check size={18} aria-hidden /> Copied</> : <><Copy size={18} aria-hidden /> Copy for LinkedIn</>}
        </Button>
      </main>
    </>
  );
}

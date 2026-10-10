"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button, TopBar } from "@/components/ui";
import { api, track } from "@/lib/client";
import { linkedInHref } from "@/lib/open-linkedin";

export function Handoff(props: {
  personId: string;
  firstName: string | null;
  linkedinUrl: string;
  note: string;
  queueMode: boolean;
  nextPersonId: string | null;
  remaining: number;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [href, setHref] = useState(props.linkedinUrl);
  const [busy, setBusy] = useState(false);

  useEffect(() => setHref(linkedInHref(props.linkedinUrl, navigator.userAgent)), [props.linkedinUrl]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(props.note);
    } catch {
      // Fallback for browsers without async clipboard permission.
      const ta = document.createElement("textarea");
      ta.value = props.note;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    if (!copied) track("note_copied", undefined, props.personId);
    setCopied(true);
  }

  async function sent() {
    setBusy(true);
    await api(`/api/connect/${props.personId}`, "PUT", { status: "sent" });
    if (props.queueMode && props.nextPersonId) router.replace(`/connect/${props.nextPersonId}/note?queue=1`);
    else router.replace("/connect");
    router.refresh();
  }

  const steps = [
    "Open their profile in LinkedIn.",
    "Tap Connect, then Add a note.",
    "Paste the note and tap Send.",
  ];

  return (
    <>
      <TopBar back={`/connect/${props.personId}/note${props.queueMode ? "?queue=1" : ""}`} title={props.queueMode ? `Queue · ${props.remaining} after this` : "Send in LinkedIn"} />
      <main className="px-6 pb-12">
        <h1 className="text-[30px] font-extrabold leading-tight">Send it to {props.firstName ?? "them"} in LinkedIn.</h1>
        <p className="mt-2 text-muted">Catch never sends anything for you.</p>

        <div className="mt-6 rounded-[22px] border border-line bg-surface p-4">
          <p className="text-[15px] leading-relaxed">{props.note}</p>
          <Button variant="secondary" size="md" className="mt-4 w-full" onClick={copy} aria-live="polite">
            {copied ? <><Check size={18} aria-hidden /> Copied</> : <><Copy size={18} aria-hidden /> Copy note</>}
          </Button>
        </div>

        <ol className="mt-6 space-y-3">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-4">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display font-bold">{i + 1}</span>
              <span className="text-[16px]">{s}</span>
            </li>
          ))}
        </ol>

        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={copy}
          className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent text-[16px] font-semibold text-on-accent"
        >
          Open LinkedIn <ExternalLink size={18} aria-hidden />
        </a>
        <p className="mt-2 text-center text-[12px] text-dim">Opening LinkedIn copies the note too.</p>
        <Button variant="secondary" className="mt-4" onClick={sent} disabled={busy}>
          I&apos;ve sent it
        </Button>
        {props.queueMode && props.nextPersonId && (
          <button type="button" onClick={() => router.replace(`/connect/${props.nextPersonId}/note?queue=1`)} className="mt-2 inline-flex h-11 w-full items-center justify-center text-[14px] text-muted hover:text-ink">
            Skip for now
          </button>
        )}
      </main>
    </>
  );
}

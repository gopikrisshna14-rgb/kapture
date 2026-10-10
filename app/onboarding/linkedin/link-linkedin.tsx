"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Zap, Check } from "lucide-react";
import { Button, Chip, Field, TopBar, cx } from "@/components/ui";
import { api } from "@/lib/client";

export function LinkLinkedIn({
  initial,
  fromAccount,
}: {
  initial: { display_name: string; linkedin_url: string };
  fromAccount: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.display_name);
  const [url, setUrl] = useState(initial.linkedin_url);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const nextHref = fromAccount ? "/account" : "/onboarding/event";

  async function save() {
    setBusy(true);
    setErr("");
    try {
      await api("/api/profile", "PATCH", { display_name: name, linkedin_url: url, connect_mode: "assisted" });
      router.push(nextHref);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar back={fromAccount ? "/account" : undefined} right={!fromAccount && <a href="/onboarding/event" className="inline-flex h-11 items-center px-2 text-[15px] text-muted hover:text-ink">Skip</a>} />
      <main className="px-6 pb-10">
        <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-dim">Optional</p>
        <h1 className="mt-1 text-[34px] font-extrabold leading-[1.05]">Link your LinkedIn.</h1>
        <p className="mt-2 text-muted">So people can find you from your code, and so you can connect from Catch.</p>

        <div className="mt-6 space-y-4">
          <Field id="name" label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Becker" />
          <Field
            id="li"
            label="Your LinkedIn profile link"
            inputMode="url"
            autoComplete="url"
            placeholder="linkedin.com/in/your-name"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <h2 className="mb-3 mt-8 text-[20px] font-bold">How should Catch connect?</h2>
        <div role="radiogroup" aria-label="Connect mode" className="space-y-3">
          <button
            type="button"
            role="radio"
            aria-checked
            className="w-full rounded-[22px] border-2 border-accent bg-surface p-5 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-on-accent">
                <ShieldCheck size={20} aria-hidden />
              </span>
              <span className="flex-1 text-[17px] font-semibold">Assisted mode</span>
              <Chip tone="accent">Safest</Chip>
            </div>
            <p className="mt-3 text-[14px] text-muted">
              Catch writes the note and opens their profile. You tap send in LinkedIn. Nothing is sent for you.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-ink">
              <Check size={16} aria-hidden /> Selected
            </span>
          </button>
          <div
            role="radio"
            aria-checked={false}
            aria-disabled
            className={cx("w-full rounded-[22px] border border-line bg-surface p-5 opacity-60")}
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted">
                <Zap size={20} aria-hidden />
              </span>
              <span className="flex-1 text-[17px] font-semibold">Direct mode</span>
              <Chip tone="muted">Advanced</Chip>
            </div>
            <p className="mt-3 text-[14px] text-muted">Send requests without leaving Catch.</p>
            <span className="mt-3 inline-block text-[13px] font-semibold text-muted">Coming later</span>
          </div>
        </div>

        {err && <p role="alert" className="mt-4 text-[14px] text-danger">{err}</p>}
        <Button className="mt-8" onClick={save} disabled={busy}>
          {fromAccount ? "Save" : "Continue"}
        </Button>
      </main>
    </>
  );
}

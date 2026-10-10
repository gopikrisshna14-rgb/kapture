"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Button, Field } from "@/components/ui";

export function PublicForm({ handle, ownerName, linkedinUrl }: { handle: string; ownerName: string; linkedinUrl: string | null }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!consent) return setErr("Please tick the box to agree.");
    setBusy(true);
    const r = await fetch(`/api/public/${handle}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, consent, website }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error ?? "Something went wrong. Try again.");
    setDone(true);
  }

  if (done)
    return (
      <div className="mt-10 rounded-[24px] border border-line bg-surface p-6" role="status">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent"><Check aria-hidden /></span>
        <h2 className="mt-4 text-[24px] font-bold">Thanks, {name.split(" ")[0]}.</h2>
        <p className="mt-1 text-muted">{ownerName} has your details now. You can ask them to delete them at any time.</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
      <Field id="pub-name" label="Your name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Field id="pub-email" label="Work email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="pub-website">Website</label>
        <input id="pub-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-line bg-surface p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => { setConsent(e.target.checked); setErr(""); }}
          className="mt-0.5 h-6 w-6 shrink-0 accent-[#D7FF3D]"
        />
        <span className="text-[14px] leading-relaxed">
          I agree to share these details with {ownerName}. I can ask for them to be deleted at any time.
        </span>
      </label>
      {err && <p role="alert" className="text-[14px] text-danger">{err}</p>}
      <Button type="submit" disabled={busy}>Share my details</Button>
      {linkedinUrl && (
        <a href={linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex h-14 w-full items-center justify-center rounded-full border border-line bg-surface text-[16px] font-semibold">
          Connect on LinkedIn instead
        </a>
      )}
    </form>
  );
}

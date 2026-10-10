"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button, Field, TopBar } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/browser";

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function SignUp({ demo, next, error }: { demo: boolean; next?: string; error?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState(error ? "That link didn't work. Try again." : "");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  async function demoSignIn(e?: string) {
    setBusy(true);
    const r = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: e || email || "you@example.com" }),
    });
    const d = await r.json();
    router.replace(d.onboarded ? safeNext : "/onboarding/linkedin");
  }

  async function magicLink(ev: React.FormEvent) {
    ev.preventDefault();
    if (demo) return demoSignIn();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg("Enter a valid email.");
    setBusy(true);
    setMsg("");
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}` },
    });
    setBusy(false);
    if (error) setMsg(error.message);
    else setSent(true);
  }

  async function google() {
    if (demo) return demoSignIn("you@gmail.com");
    await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}` },
    });
  }

  if (sent)
    return (
      <main className="flex min-h-dvh flex-col justify-center px-6">
        <span className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent text-on-accent">
          <Mail size={28} aria-hidden />
        </span>
        <h1 className="text-[32px] font-extrabold leading-tight">Check your email.</h1>
        <p className="mt-3 text-muted">
          We sent a sign-in link to <span className="text-ink">{email}</span>. Open it on this phone.
        </p>
        <Button variant="secondary" className="mt-8" onClick={() => setSent(false)}>
          Use a different email
        </Button>
      </main>
    );

  return (
    <>
      <TopBar back="/welcome" />
      <main className="px-6 pb-10">
        <h1 className="text-[34px] font-extrabold leading-[1.05]">Create your account.</h1>
        <p className="mt-2 text-muted">Free for your first 50 people every month.</p>
        {demo && (
          <p className="mt-4 rounded-2xl border border-line bg-surface p-3 text-[14px] text-muted">
            Demo mode: no email is sent. Any address signs you in.
          </p>
        )}
        <div className="mt-8 space-y-3">
          <Button variant="secondary" onClick={google} disabled={busy}>
            <GoogleMark /> Continue with Google
          </Button>
        </div>
        <div className="my-6 flex items-center gap-3 text-[13px] text-dim">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>
        <form onSubmit={magicLink} className="space-y-4">
          <Field
            id="email"
            label="Work email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {msg && (
            <p role="alert" className="text-[14px] text-danger">
              {msg}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {demo ? "Continue" : "Email me a sign-in link"}
          </Button>
        </form>
        <p className="mt-6 text-center text-[13px] text-dim">
          Your data is stored in the EU (Frankfurt).
        </p>
      </main>
    </>
  );
}

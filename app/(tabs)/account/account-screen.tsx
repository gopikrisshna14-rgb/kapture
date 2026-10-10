"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ShieldCheck, NotebookPen, CreditCard, Link2, LogOut, BarChart3, Users } from "lucide-react";
import { Avatar, Button, Field, SectionLabel, Chip } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { api } from "@/lib/client";
import { PURPOSES } from "@/lib/labels";
import type { Profile } from "@/lib/types";

function Row({ href, icon: I, label, detail }: { href: string; icon: typeof Link2; label: string; detail?: string }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-4 px-4 py-3 hover:bg-surface-2">
      <I size={20} className="text-muted" aria-hidden />
      <span className="flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        {detail && <span className="block text-[13px] text-muted">{detail}</span>}
      </span>
      <ChevronRight size={18} className="text-dim" aria-hidden />
    </Link>
  );
}

export function AccountScreen({
  profile,
  email,
  backends,
  isAdmin,
}: {
  profile: Profile;
  email: string | null;
  backends: { data: string; profiles: string; ai: string; demoMode: boolean };
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    display_name: profile.display_name ?? "",
    headline: profile.headline ?? "",
    company: profile.company ?? "",
    handle: profile.handle ?? "",
    max_note_length: String(profile.max_note_length ?? 200),
  });
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    try {
      await api("/api/profile", "PATCH", { ...form, max_note_length: Number(form.max_note_length) || 200 });
      setEdit(false);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function signOut() {
    await api("/api/auth/signout", "POST");
    router.replace("/welcome");
  }

  const anyDemo = backends.data === "demo" || backends.profiles === "fixtures" || backends.ai === "fixtures";

  return (
    <main className="px-5 pt-[max(env(safe-area-inset-top),16px)]">
      <h1 className="mt-14 text-[40px] font-extrabold leading-none">Account</h1>

      <button type="button" onClick={() => setEdit(true)} className="mt-6 flex w-full items-center gap-4 rounded-[22px] border border-line bg-surface p-4 text-left hover:bg-surface-2">
        <Avatar name={profile.display_name ?? email} size={52} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold">{profile.display_name ?? "Add your name"}</span>
          <span className="block truncate text-[13px] text-muted">{email}</span>
          <span className="block truncate text-[13px] text-muted">catch/c/{profile.handle}</span>
        </span>
        <span className="text-[13px] font-semibold text-accent">Edit</span>
      </button>

      {anyDemo && (
        <div className="mt-4 rounded-[20px] border border-line bg-surface p-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold"><Chip tone="accent">Demo</Chip> Some parts use sample data</p>
          <p className="mt-2 text-[13px] text-muted">
            Data: {backends.data === "demo" ? "local demo store" : "Supabase"} · Profiles: {backends.profiles === "fixtures" ? "sample profiles" : "Apify"} · AI: {backends.ai === "fixtures" ? "sample text" : "Claude"}
          </p>
        </div>
      )}

      <SectionLabel>
        <span className="mt-6 block">Settings</span>
      </SectionLabel>
      <nav className="overflow-hidden rounded-[22px] border border-line bg-surface" aria-label="Settings">
        <Row href="/onboarding/linkedin" icon={Link2} label="LinkedIn" detail={profile.linkedin_url ? "Linked · Assisted mode" : "Not linked"} />
        <Row href="/connect/notes" icon={NotebookPen} label="Saved connection notes" detail={`Max ${profile.max_note_length ?? 200} characters`} />
        <Row href="/account/privacy" icon={ShieldCheck} label="Data and privacy" />
        <Row href="/account/plans" icon={CreditCard} label="Plans" detail="Free" />
        <Row href="/events/new" icon={Users} label="New event" detail={PURPOSES.find((p) => p.id === profile.purpose)?.label} />
        {isAdmin && <Row href="/admin/pilot" icon={BarChart3} label="Pilot dashboard" />}
      </nav>

      <Button variant="secondary" className="mt-6" onClick={signOut}>
        <LogOut size={18} aria-hidden /> Sign out
      </Button>
      <p className="mt-4 pb-6 text-center text-[12px] text-dim">Catch · Meet people. Stay in touch.</p>

      <Sheet open={edit} onClose={() => setEdit(false)} title="Your details">
        <div className="max-h-[70dvh] space-y-4 overflow-y-auto pb-2">
          <Field id="a-name" label="Name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          <Field id="a-headline" label="Headline (shown on your Catch page)" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
          <Field id="a-company" label="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <Field id="a-handle" label="Your Catch link" hint="Letters and numbers only." value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
          <Field id="a-max" label="Connection note limit (characters)" type="number" inputMode="numeric" min={80} max={300} hint="LinkedIn's limit can differ by account. Default 200." value={form.max_note_length} onChange={(e) => setForm({ ...form, max_note_length: e.target.value })} />
          {err && <p role="alert" className="text-[14px] text-danger">{err}</p>}
          <Button onClick={save}>Save</Button>
        </div>
      </Sheet>
    </main>
  );
}

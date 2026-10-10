"use client";
import { useState } from "react";
import { Check, FileSpreadsheet, Mail, Download, Lock, Database } from "lucide-react";
import { Button, ButtonLink, ChoiceChip, Chip, TopBar, cx } from "@/components/ui";
import { api } from "@/lib/client";

type Filter = "all" | "priority" | "not_followed_up";

export function ExportScreen({ email, counts }: { email: string | null; counts: Record<Filter, number> }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [format, setFormat] = useState<"csv" | "email">("csv");
  const [done, setDone] = useState<null | "csv" | "email">(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      if (format === "csv") {
        const a = document.createElement("a");
        a.href = `/api/export?filter=${filter}`;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setDone("csv");
      } else {
        const { url } = await api<{ url: string }>("/api/export/link", "POST", { filter });
        const body = `Your Catch export (${counts[filter]} people) is ready. The link works for 24 hours:\n\n${url}\n`;
        location.href = `mailto:${email ? encodeURIComponent(email) : ""}?subject=${encodeURIComponent("Your Catch export")}&body=${encodeURIComponent(body)}`;
        setDone("email");
      }
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <>
        <TopBar back="/people" />
        <main className="flex flex-col px-6 pb-12 pt-10">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent text-on-accent"><Check size={30} aria-hidden /></span>
          <h1 className="mt-6 text-[34px] font-extrabold leading-tight">{done === "csv" ? "Your export is downloading." : "Check your email app."}</h1>
          <p className="mt-2 text-muted">
            {counts[filter]} {counts[filter] === 1 ? "person" : "people"}
            {done === "email" ? ". The download link in the email works for 24 hours." : ", as a CSV that opens in Excel, Numbers or Google Sheets."}
          </p>
          <ButtonLink href="/people" className="mt-10">Back to People</ButtonLink>
          <Button variant="ghost" className="mt-2" onClick={() => setDone(null)}>Export again</Button>
        </main>
      </>
    );

  return (
    <>
      <TopBar back="/people" title="Export" />
      <main className="px-6 pb-12">
        <h1 className="text-[34px] font-extrabold leading-tight">Export people</h1>

        <fieldset className="mt-6">
          <legend className="mb-2 text-[13px] font-medium text-muted">Who</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["priority", "Priority"],
                ["not_followed_up", "Not followed up"],
              ] as const
            ).map(([id, l]) => (
              <ChoiceChip key={id} selected={filter === id} onClick={() => setFilter(id)}>
                {l} <span className="opacity-70">{counts[id]}</span>
              </ChoiceChip>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mb-2 text-[13px] font-medium text-muted">Format</legend>
          <div className="space-y-2" role="radiogroup">
            {(
              [
                ["csv", "CSV file", "Opens in Excel, Numbers, Google Sheets", Download],
                ["email", "Email it to me", email ? `A 24-hour download link to ${email}` : "A 24-hour download link", Mail],
              ] as const
            ).map(([id, l, d, I]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={format === id}
                onClick={() => setFormat(id)}
                className={cx("flex w-full items-center gap-4 rounded-[20px] border bg-surface p-4 text-left", format === id ? "border-accent" : "border-line")}
              >
                <I size={20} aria-hidden className="text-muted" />
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold">{l}</span>
                  <span className="block text-[13px] text-muted">{d}</span>
                </span>
                {format === id && <Check size={18} className="text-accent" aria-hidden />}
              </button>
            ))}
            {(
              [
                ["Excel file", FileSpreadsheet],
                ["Send to CRM", Database],
              ] as const
            ).map(([l, I]) => (
              <div key={l} aria-disabled className="flex items-center gap-4 rounded-[20px] border border-line bg-surface p-4 opacity-60">
                <I size={20} aria-hidden className="text-muted" />
                <span className="flex-1 text-[15px] font-semibold">{l}</span>
                <Chip tone="muted"><Lock size={12} aria-hidden /> Pro</Chip>
              </div>
            ))}
          </div>
        </fieldset>

        <Button className="mt-8" onClick={go} disabled={busy || counts[filter] === 0}>
          {counts[filter] === 0 ? "No one to export" : `Export ${counts[filter]} ${counts[filter] === 1 ? "person" : "people"}`}
        </Button>
      </main>
    </>
  );
}

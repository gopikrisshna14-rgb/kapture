import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server-page";
import { adminUserId, hasSupabase } from "@/lib/config";
import { DEMO_USER_ID } from "@/lib/db/demo-store";
import { allUsageEvents } from "@/lib/session";
import { pilotMetrics } from "@/lib/pilot";
import { Card, TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

const pct = (v: number | null) => (v === null ? "–" : `${Math.round(v * 100)}%`);

export default async function PilotPage() {
  const { profile } = await requireUser({ needEvent: false });
  const admin = adminUserId();
  const allowed = admin ? admin === profile.id : !hasSupabase() && profile.id === DEMO_USER_ID;
  if (!allowed) notFound();
  const m = pilotMetrics(await allUsageEvents());

  const tiles: [string, string, string][] = [
    ["Median capture time", m.medianCaptureSeconds === null ? "–" : `${m.medianCaptureSeconds} s`, "Scan to saved"],
    ["Profile completeness", pct(m.medianCompleteness), "Median share of expected fields"],
    ["Follow-ups within 24 h", pct(m.followupWithin24h), "Email opened or request sent"],
    ["Acceptance rate", pct(m.acceptanceRate), `${m.accepted} of ${m.requestsSent} sent`],
  ];
  return (
    <>
      <TopBar back="/account" title="Pilot" />
      <main className="px-5 pb-12">
        <h1 className="text-[34px] font-extrabold leading-tight">Pilot dashboard</h1>
        <p className="mt-1 text-muted">{m.users} users · {m.captures} captures saved</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {tiles.map(([l, v, d]) => (
            <Card key={l} className="p-4">
              <p className="text-[13px] text-muted">{l}</p>
              <p className="mt-1 font-display text-[32px] font-extrabold leading-none">{v}</p>
              <p className="mt-2 text-[12px] text-dim">{d}</p>
            </Card>
          ))}
        </div>
        <Card className="mt-3 space-y-2 p-4 text-[14px]">
          <p className="flex justify-between"><span className="text-muted">Enrichment ok / partial / failed</span><span>{m.enrichment.ok} / {m.enrichment.partial} / {m.enrichment.failed}</span></p>
          <p className="flex justify-between"><span className="text-muted">Notes copied</span><span>{m.notesCopied}</span></p>
          <p className="flex justify-between"><span className="text-muted">Exports</span><span>{m.exports}</span></p>
        </Card>
        <p className="mt-4 text-[12px] text-dim">From usage_events only. No personal data is shown here.</p>
      </main>
    </>
  );
}

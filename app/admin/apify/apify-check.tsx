"use client";
import { useEffect, useState } from "react";
import { Check, X, Loader2, Copy } from "lucide-react";
import { Button, Card, Field, SectionLabel, TopBar, cx } from "@/components/ui";
import { api } from "@/lib/client";

interface Status {
  token: boolean;
  actor: string | null;
  postsActor: string | null;
  searchActor: string | null;
  inputTemplate: string | null;
  fieldMap: string | null;
  demoMode: boolean;
}
interface Schema {
  title?: string;
  properties: { key: string; type: string; title?: string }[];
  required: string[];
}
interface Run {
  seconds: number;
  input: unknown;
  items?: number;
  shape?: unknown;
  mapping?: Record<string, string | null> | null;
  profile?: Record<string, unknown> | null;
  preview?: [string, string][];
  error?: string;
}

const BASIC = ["name", "headline", "role", "company", "location", "photo"];

function Row({ ok, label, detail }: { ok: boolean; label: string; detail?: string | null }) {
  return (
    <div className="flex min-h-10 items-center gap-3">
      {ok ? <Check size={18} className="shrink-0 text-accent" aria-label="OK" /> : <X size={18} className="shrink-0 text-danger" aria-label="Missing" />}
      <span className="flex-1 text-[15px]">{label}</span>
      {detail && <span className="max-w-[55%] truncate text-right text-[13px] text-muted">{detail}</span>}
    </div>
  );
}

export function ApifyCheck() {
  const [data, setData] = useState<{ status: Status; schema: Schema | null; error?: string } | null>(null);
  const [url, setUrl] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<{ status: Status; schema: Schema | null; error?: string }>("/api/admin/apify").then(setData).catch(() => {});
  }, []);

  async function test() {
    setBusy(true);
    setRun(null);
    try {
      const r = await fetch("/api/admin/apify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      setRun(await r.json());
    } finally {
      setBusy(false);
    }
  }

  const s = data?.status;
  const live = s && s.token && s.actor && !s.demoMode;
  const suggested = run?.mapping
    ? JSON.stringify(Object.fromEntries(Object.entries(run.mapping).filter(([, v]) => v))) : null;

  return (
    <>
      <TopBar back="/account" title="Apify" />
      <main className="px-6 pb-12">
        <h1 className="text-[32px] font-extrabold leading-tight">Apify connection</h1>
        <p className="mt-1 text-muted">Check that LinkedIn profiles are read correctly before you go live.</p>

        <SectionLabel><span className="mt-6 block">Setup</span></SectionLabel>
        <Card className="p-4">
          {!s ? (
            <Loader2 className="animate-spin text-muted" aria-label="Loading" />
          ) : (
            <>
              <Row ok={s.token} label="APIFY_TOKEN" detail={s.token ? "set" : "missing"} />
              <Row ok={Boolean(s.actor)} label="APIFY_PROFILE_ACTOR" detail={s.actor ?? "missing"} />
              <Row ok={!s.demoMode} label="DEMO_MODE=false" detail={s.demoMode ? "still in demo mode" : "live"} />
              <Row ok={Boolean(data?.schema) && !data?.error} label="Apify accepts both" detail={data?.error ?? data?.schema?.title ?? null} />
              <p className={cx("mt-3 text-[13px]", live ? "text-accent" : "text-muted")}>
                {live ? "New captures read LinkedIn profiles through Apify." : "Captures still use sample profiles until all four are green."}
              </p>
            </>
          )}
        </Card>

        {data?.schema && data.schema.properties.length > 0 && (
          <>
            <SectionLabel><span className="mt-6 block">What the actor expects</span></SectionLabel>
            <Card className="space-y-1 p-4 text-[14px]">
              {data.schema.properties.map((p) => (
                <p key={p.key} className="flex justify-between gap-3">
                  <span className="font-mono">{p.key}{data.schema!.required.includes(p.key) ? " *" : ""}</span>
                  <span className="truncate text-muted">{p.type}{p.title ? ` · ${p.title}` : ""}</span>
                </p>
              ))}
              <p className="pt-2 text-[12px] text-dim">
                {s?.inputTemplate ? (
                  <>Using your APIFY_PROFILE_INPUT: <span className="font-mono">{s.inputTemplate}</span></>
                ) : (
                  <>The app picks the link field from this list automatically. The test below shows exactly what it sent.</>
                )}
              </p>
            </Card>
          </>
        )}

        <SectionLabel><span className="mt-6 block">Test a profile</span></SectionLabel>
        <Field id="apify-url" label="LinkedIn profile link (use your own, or someone who agreed)" inputMode="url" placeholder="linkedin.com/in/…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button className="mt-3" onClick={test} disabled={busy || !url.trim() || !s?.token || !s?.actor}>
          {busy ? <><Loader2 size={18} className="animate-spin" aria-hidden /> Running on Apify… (up to a minute)</> : "Run test"}
        </Button>

        {run && (
          <div className="mt-6 space-y-4">
            {run.error ? (
              <Card className="border-danger p-4 text-[14px]">
                <p className="font-semibold text-danger">Apify run failed</p>
                <p className="mt-1 text-muted">{run.error}</p>
                <p className="mt-2 text-[12px] text-dim">Sent: <span className="font-mono">{JSON.stringify(run.input)}</span></p>
              </Card>
            ) : run.items === 0 ? (
              <Card className="p-4 text-[14px] text-muted">
                The actor finished in {run.seconds.toFixed(1)} s but returned nothing. It may not support this profile, or it needs a different input.
                <p className="mt-2 text-[12px] text-dim">Sent: <span className="font-mono">{JSON.stringify(run.input)}</span></p>
              </Card>
            ) : !BASIC.some((f) => run.profile?.[f === "photo" ? "photoUrl" : f]) ? (
              <>
                <Card className="border-danger p-4 text-[14px]">
                  <p className="font-semibold text-danger">Apify answered, but not with a profile</p>
                  <p className="mt-1 text-muted">
                    Usually this means the profile doesn&apos;t exist or is hidden, or the actor needs a LinkedIn login (cookies). Try your own profile link. If it&apos;s the same, choose a different actor.
                  </p>
                  <p className="mt-3 font-semibold">What Apify returned</p>
                  <dl className="mt-1 space-y-1">
                    {(run.preview ?? []).map(([k, v]) => (
                      <div key={k} className="flex gap-3 text-[13px]">
                        <dt className="shrink-0 font-mono text-muted">{k}</dt>
                        <dd className="min-w-0 break-words">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-[12px] text-dim">Sent: <span className="font-mono">{JSON.stringify(run.input)}</span> · {run.seconds.toFixed(1)} s</p>
                </Card>
              </>
            ) : (
              <>
                <Card className="p-4">
                  <p className="text-[13px] text-muted">Basic data, finished in {run.seconds.toFixed(1)} s · sent <span className="font-mono">{JSON.stringify(run.input)}</span></p>
                  {BASIC.map((f) => {
                    const val = run.profile?.[f === "photo" ? "photoUrl" : f];
                    return <Row key={f} ok={Boolean(val)} label={f} detail={typeof val === "string" ? val : run.mapping?.[f] ?? "not found"} />;
                  })}
                </Card>
                <Card className="p-4 text-[13px]">
                  <p className="mb-2 font-semibold">Where each field came from</p>
                  {Object.entries(run.mapping ?? {}).map(([k, v]) => (
                    <p key={k} className="flex justify-between gap-3">
                      <span>{k}</span>
                      <span className={cx("font-mono", v ? "text-ink" : "text-dim")}>{v ?? "–"}</span>
                    </p>
                  ))}
                  {suggested && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => {
                        navigator.clipboard.writeText(suggested).catch(() => {});
                        setCopied(true);
                      }}
                    >
                      <Copy size={16} aria-hidden /> {copied ? "Copied" : "Copy as APIFY_FIELD_MAP"}
                    </Button>
                  )}
                </Card>
                <details className="rounded-[22px] border border-line bg-surface p-4 text-[12px]">
                  <summary className="min-h-11 cursor-pointer py-3 text-[14px] font-semibold">Raw item shape (key names and types)</summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-muted">{JSON.stringify(run.shape, null, 2)}</pre>
                </details>
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button, ButtonLink, TopBar } from "@/components/ui";
import { api, track } from "@/lib/client";

export function ShareCapture({ linkedinUrl, otherUrl }: { linkedinUrl: string | null; otherUrl: string | null }) {
  const router = useRouter();
  const started = useRef(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!linkedinUrl || started.current) return;
    started.current = true;
    try {
      sessionStorage.setItem("catch_capture_start", String(Date.now()));
    } catch {}
    track("capture_started", { via: "share" });
    api<{ id: string }>("/api/capture", "POST", { kind: "linkedin", url: linkedinUrl, via: "link" })
      .then((r) => router.replace(`/capture/${r.id}`))
      .catch((e) => setErr((e as Error).message));
  }, [linkedinUrl, router]);

  if (linkedinUrl && !err)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-muted" role="status">
        <Loader2 className="animate-spin" aria-hidden /> Catching their profile…
      </main>
    );

  return (
    <>
      <TopBar back="/people" />
      <main className="px-6 pb-12">
        <h1 className="text-[30px] font-extrabold leading-tight">That share didn&apos;t include a LinkedIn profile.</h1>
        <p className="mt-2 text-muted">{err || "Share a person's profile from the LinkedIn app, or scan their code instead."}</p>
        <div className="mt-8 space-y-3">
          <ButtonLink href="/scan">Scan instead</ButtonLink>
          {otherUrl && (
            <Button variant="secondary" onClick={() => api<{ id: string; next: string }>("/api/capture", "POST", { kind: "link", url: otherUrl }).then((r) => router.replace(`/capture/${r.id}/review`))}>
              Save the link anyway
            </Button>
          )}
        </div>
      </main>
    </>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, ClipboardPaste, Keyboard, ImageUp, Camera, Loader2 } from "lucide-react";
import { Button, Field, Segmented, cx } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { api, track } from "@/lib/client";
import { classifyQr } from "@/lib/qr-classify";
import type { CardFields } from "@/lib/types";

type Mode = "qr" | "card" | "digital";
type Next = { id: string; next: "loading" | "match" | "review" };

const MODES: { id: Mode; label: string }[] = [
  { id: "qr", label: "LinkedIn QR" },
  { id: "card", label: "Card" },
  { id: "digital", label: "Digital card" },
];

interface Detector {
  detect(src: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

export function Scanner({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [camState, setCamState] = useState<"starting" | "on" | "denied" | "none">("starting");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [sheet, setSheet] = useState<"paste" | "type" | null>(null);
  const [paste, setPaste] = useState("");
  const [typed, setTyped] = useState({ name: "", company: "" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const handled = useRef(false);

  // Capture timer for the pilot metric "seconds from scan to saved".
  useEffect(() => {
    try {
      sessionStorage.setItem("catch_capture_start", String(Date.now()));
    } catch {}
    track("capture_started");
  }, []);

  const go = useCallback(
    (r: Next) => {
      const base = `/capture/${r.id}`;
      router.replace(r.next === "loading" ? base : `${base}/${r.next}`);
    },
    [router],
  );

  const submit = useCallback(
    async (body: Record<string, unknown>, label = "Reading…") => {
      setBusy(label);
      setMsg("");
      try {
        go(await api<Next>("/api/capture", "POST", body));
      } catch (e) {
        setBusy(null);
        handled.current = false;
        setMsg((e as Error).message);
      }
    },
    [go],
  );

  const onQr = useCallback(
    (text: string) => {
      if (handled.current) return;
      const p = classifyQr(text);
      if (p.kind === "unknown") {
        setMsg("That code isn't a profile or contact card.");
        return;
      }
      handled.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
      if (p.kind === "linkedin") submit({ kind: "linkedin", url: p.url, via: "qr" }, "Code read");
      else if (p.kind === "contact") submit({ kind: "contact", fields: p.fields }, "Card read");
      else submit({ kind: "link", url: p.url }, "Link read");
    },
    [submit],
  );

  // Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setCamState("none");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});
        setCamState("on");
      } catch (e) {
        setCamState((e as Error).name === "NotAllowedError" ? "denied" : "none");
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // QR loop: BarcodeDetector where available, else jsQR.
  useEffect(() => {
    if (camState !== "on" || mode === "card") return;
    let alive = true;
    let detector: Detector | null = null;
    let jsqr: typeof import("jsqr").default | null = null;
    const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const init = (async () => {
      if (BD) {
        try {
          detector = new BD({ formats: ["qr_code"] });
          return;
        } catch {}
      }
      jsqr = (await import("jsqr")).default;
    })();
    const tick = async () => {
      await init;
      while (alive && !handled.current) {
        const v = videoRef.current;
        if (v && v.readyState >= 2 && v.videoWidth) {
          try {
            if (detector) {
              const codes = await detector.detect(v);
              if (codes[0]?.rawValue) onQr(codes[0].rawValue);
            } else if (jsqr) {
              const c = canvasRef.current!;
              const scale = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
              c.width = Math.round(v.videoWidth * scale);
              c.height = Math.round(v.videoHeight * scale);
              const ctx = c.getContext("2d", { willReadFrequently: true })!;
              ctx.drawImage(v, 0, 0, c.width, c.height);
              const img = ctx.getImageData(0, 0, c.width, c.height);
              const code = jsqr(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
              if (code?.data) onQr(code.data);
            }
          } catch {}
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    };
    tick();
    return () => {
      alive = false;
    };
  }, [camState, mode, onQr]);

  async function ocr(blob: Blob) {
    setBusy("Reading the card…");
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("image", blob, "card.jpg");
      const r = await fetch("/api/card/ocr", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "We couldn't read that card.");
      await submit({ kind: "card", fields: d as CardFields }, "Saving…");
    } catch (e) {
      setBusy(null);
      setMsg((e as Error).message);
    }
  }

  function shoot() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return;
    const scale = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((b) => b && ocr(b), "image/jpeg", 0.85);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (mode === "card") return ocr(await downscale(f));
    // QR from a screenshot
    const bmp = await createImageBitmap(f);
    const c = canvasRef.current!;
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const jsqr = (await import("jsqr")).default;
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsqr(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
    if (code?.data) onQr(code.data);
    else setMsg("No code found in that image.");
  }

  async function pasteFromClipboard() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setPaste(t);
    } catch {}
  }

  const hint =
    mode === "qr"
      ? "Point at their LinkedIn QR code. In the LinkedIn app it's under the search bar."
      : mode === "card"
        ? "Fit the card inside the frame, then tap the button."
        : "Point at a digital business card or vCard code.";

  return (
    <div className="relative flex min-h-dvh flex-col bg-black">
      <header className="relative z-10 flex items-center gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
        <Link href="/people" aria-label="Close scanner" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/80 text-ink">
          <X size={22} aria-hidden />
        </Link>
        <div className="flex-1">
          <Segmented label="What are you scanning?" options={MODES} value={mode} onChange={(m) => { setMode(m); setMsg(""); handled.current = false; }} />
        </div>
      </header>

      <div className="relative mx-4 flex-1 overflow-hidden rounded-[24px] bg-surface" style={{ minHeight: 360 }}>
        <video ref={videoRef} playsInline muted className={cx("absolute inset-0 h-full w-full object-cover", camState !== "on" && "hidden")} aria-hidden />
        <canvas ref={canvasRef} className="hidden" aria-hidden />
        {camState !== "on" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
            {camState === "starting" ? (
              <Loader2 className="animate-spin text-muted" aria-label="Starting camera" />
            ) : (
              <>
                <Camera size={32} className="text-muted" aria-hidden />
                <p className="text-muted">
                  {camState === "denied" ? "Camera access is off. Allow it in your browser settings, or use a photo." : "No camera found. Use a photo or screenshot instead."}
                </p>
              </>
            )}
          </div>
        )}
        {/* Corner brackets */}
        <div aria-hidden className={cx("pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2", mode === "card" ? "h-[200px] w-[86%]" : "h-[240px] w-[240px]")}>
          {["left-0 top-0 border-l-4 border-t-4 rounded-tl-[18px]", "right-0 top-0 border-r-4 border-t-4 rounded-tr-[18px]", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-[18px]", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-[18px]"].map((c) => (
            <span key={c} className={cx("absolute h-10 w-10 border-accent", c)} />
          ))}
          {mode !== "card" && camState === "on" && !busy && <span className="animate-scanline absolute left-3 right-3 top-2 h-0.5 rounded bg-accent/80" />}
        </div>
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60" role="status" aria-live="polite">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 font-semibold text-on-accent">
              <Loader2 size={18} className="animate-spin" aria-hidden /> {busy}
            </span>
          </div>
        )}
      </div>

      <div className="px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-4">
        <p className="min-h-10 text-center text-[14px] text-muted" aria-live="polite">
          {msg ? <span className="text-danger">{msg}</span> : hint}
        </p>
        {mode === "card" && (
          <div className="mb-4 flex items-center justify-center gap-6">
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Use a photo or screenshot" className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-ink">
              <ImageUp size={20} aria-hidden />
            </button>
            <button type="button" onClick={shoot} disabled={camState !== "on" || Boolean(busy)} aria-label="Take photo of card" className="inline-flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-ink bg-accent disabled:opacity-40">
              <span className="sr-only">Take photo</span>
            </button>
            <span className="w-12" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="md" onClick={() => setSheet("paste")}>
            <ClipboardPaste size={18} aria-hidden /> Paste link
          </Button>
          <Button variant="secondary" size="md" onClick={() => setSheet("type")}>
            <Keyboard size={18} aria-hidden /> Type name
          </Button>
        </div>
        {mode !== "card" && (
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 inline-flex h-11 w-full items-center justify-center text-[14px] text-muted hover:text-ink">
            Scan from a screenshot
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="Choose image" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      <Sheet open={sheet === "paste"} onClose={() => setSheet(null)} title="Paste a link">
        <form onSubmit={(e) => { e.preventDefault(); setSheet(null); submit({ kind: "link", url: paste }); }} className="space-y-4">
          <Field id="paste" label="LinkedIn profile or any link" inputMode="url" placeholder="linkedin.com/in/…" value={paste} onChange={(e) => setPaste(e.target.value)} autoFocus />
          <button type="button" onClick={pasteFromClipboard} className="text-[14px] font-medium text-accent">Paste from clipboard</button>
          <Button type="submit" disabled={!paste.trim()}>Continue</Button>
        </form>
      </Sheet>
      <Sheet open={sheet === "type"} onClose={() => setSheet(null)} title="Type their name">
        <form onSubmit={(e) => { e.preventDefault(); setSheet(null); submit({ kind: "manual", full_name: typed.name, company: typed.company }); }} className="space-y-4">
          <Field id="typed-name" label="Name" autoComplete="off" value={typed.name} onChange={(e) => setTyped({ ...typed, name: e.target.value })} autoFocus />
          <Field id="typed-company" label="Company (optional)" autoComplete="off" value={typed.company} onChange={(e) => setTyped({ ...typed, company: e.target.value })} />
          <Button type="submit" disabled={!typed.name.trim()}>Continue</Button>
        </form>
      </Sheet>
    </div>
  );
}

async function downscale(f: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(f);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && f.size < 4_000_000 && /jpe?g|png|webp/.test(f.type)) return f;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob((b) => r(b ?? f), "image/jpeg", 0.85));
  } catch {
    return f;
  }
}

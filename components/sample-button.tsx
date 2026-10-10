"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "./ui";
import { api } from "@/lib/client";

/** Demo only: fills the account with sample people so every screen has content. */
export function SampleButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true);
    setErr("");
    try {
      await api("/api/demo/seed", "POST");
      router.push("/people");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button variant="secondary" className={className} onClick={go} disabled={busy}>
        {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Sparkles size={18} aria-hidden />}
        {busy ? "Adding sample people…" : "Add sample people"}
      </Button>
      {err && <p role="alert" className="mt-2 text-[14px] text-danger">{err}</p>}
    </>
  );
}

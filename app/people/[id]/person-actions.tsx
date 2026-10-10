"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, Switch } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { api } from "@/lib/client";

export function PersonActions({ id, followedUp, name }: { id: string; followedUp: boolean; name: string | null }) {
  const router = useRouter();
  const [done, setDone] = useState(followedUp);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle(v: boolean) {
    setDone(v);
    await api(`/api/people/${id}`, "PATCH", { followed_up: v });
    router.refresh();
  }
  async function del() {
    setBusy(true);
    await api(`/api/people/${id}`, "DELETE");
    router.replace("/people");
    router.refresh();
  }

  return (
    <>
      <div className="mt-6 rounded-[22px] border border-line bg-surface px-4 py-2">
        <Switch checked={done} onChange={toggle} label="Followed up" description="Turn on once you've been in touch." />
      </div>
      <Button variant="danger" size="md" className="mt-6 w-full" onClick={() => setConfirm(true)}>
        <Trash2 size={18} aria-hidden /> Delete {name ? name.split(" ")[0] : "this person"}
      </Button>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Delete for good?">
        <p className="text-muted">This removes their details, notes, voice note, photo and any cached profile data. It can&apos;t be undone.</p>
        <div className="mt-6 space-y-3">
          <Button variant="danger" onClick={del} disabled={busy}>Delete permanently</Button>
          <Button variant="secondary" onClick={() => setConfirm(false)}>Keep</Button>
        </div>
      </Sheet>
    </>
  );
}

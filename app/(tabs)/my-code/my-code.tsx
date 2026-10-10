"use client";
import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button, ButtonLink, Segmented } from "@/components/ui";

export function MyCode(props: { name: string | null; catchUrl: string | null; catchSvg: string | null; linkedinUrl: string | null; linkedinSvg: string | null }) {
  const [tab, setTab] = useState<"catch" | "linkedin">("catch");
  const [copied, setCopied] = useState(false);
  const url = tab === "catch" ? props.catchUrl : props.linkedinUrl;
  const svg = tab === "catch" ? props.catchSvg : props.linkedinSvg;

  async function share() {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: props.name ? `${props.name} on Catch` : "My contact", url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="px-6 pt-[max(env(safe-area-inset-top),16px)]">
      <h1 className="mt-14 text-[40px] font-extrabold leading-none">My code</h1>
      <p className="mt-2 text-muted">Let people catch you, too.</p>
      <div className="mt-6">
        <Segmented
          label="Which code"
          value={tab}
          onChange={setTab}
          options={[
            { id: "catch", label: "Catch code" },
            { id: "linkedin", label: "LinkedIn code" },
          ]}
        />
      </div>

      <div className="mt-6 rounded-[24px] border border-line bg-surface p-6 text-center">
        {svg ? (
          <>
            <div
              className="mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-[18px] bg-ink p-3 [&_svg]:h-full [&_svg]:w-full"
              role="img"
              aria-label={tab === "catch" ? "QR code for your Catch page" : "QR code for your LinkedIn profile"}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p className="mt-4 font-display text-[22px] font-bold">{props.name ?? "You"}</p>
            <p className="mt-1 break-all text-[13px] text-muted">{url?.replace(/^https?:\/\//, "")}</p>
            <p className="mt-3 text-[14px] text-muted">
              {tab === "catch"
                ? "They scan it, type their name and email, and agree to share. They land in your People list."
                : "Opens your LinkedIn profile so they can connect with you."}
            </p>
          </>
        ) : (
          <div className="py-8">
            <p className="text-muted">Add your LinkedIn profile link to show this code.</p>
            <ButtonLink href="/onboarding/linkedin" variant="secondary" className="mt-4">Add LinkedIn link</ButtonLink>
          </div>
        )}
      </div>

      {url && (
        <Button className="mt-6" onClick={share}>
          {copied ? <><Check size={18} aria-hidden /> Link copied</> : <><Share2 size={18} aria-hidden /> Share link</>}
        </Button>
      )}
    </main>
  );
}

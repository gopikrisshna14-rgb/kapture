"use client";
import { useState } from "react";
import Link from "next/link";
import { ScanLine, Sparkles, Bell } from "lucide-react";
import { Button, cx } from "@/components/ui";
import { useRouter } from "next/navigation";

const slides = [
  {
    title: "Meet people.\nStay in touch.",
    body: "Catch keeps everyone you meet at an event in one place, so nobody slips through.",
    Icon: Sparkles,
  },
  {
    title: "Scan it.\nDon't type it.",
    body: "Scan a LinkedIn code or snap a business card. The profile fills itself in. Connect when you're ready.",
    Icon: ScanLine,
  },
  {
    title: "Follow up while it's still fresh.",
    body: "Add a quick voice note, then send a ready-made note or email the next day.",
    Icon: Bell,
  },
];

export function Welcome({ next }: { next?: string }) {
  const [i, setI] = useState(0);
  const router = useRouter();
  const s = slides[i];
  const signup = `/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  const last = i === slides.length - 1;
  return (
    <main className="flex min-h-dvh flex-col px-6 pb-8 pt-[max(env(safe-area-inset-top),24px)]">
      <div className="flex h-11 items-center justify-between">
        <span className="font-display text-[22px] font-extrabold">Catch</span>
        {!last && (
          <Link href={signup} className="inline-flex h-11 items-center px-2 text-[15px] text-muted hover:text-ink">
            Skip
          </Link>
        )}
      </div>

      <div key={i} className="animate-rise flex flex-1 flex-col justify-center">
        <div className="mb-10 flex h-[220px] items-center justify-center rounded-[24px] border border-line bg-surface">
          <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-accent text-on-accent">
            <s.Icon size={44} strokeWidth={2} aria-hidden />
          </span>
        </div>
        <h1 className="whitespace-pre-line text-[40px] font-extrabold leading-[1.02]">{s.title}</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted">{s.body}</p>
      </div>

      <div className="mb-6 flex justify-center gap-2" role="tablist" aria-label="Onboarding slides">
        {slides.map((_, k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === i}
            aria-label={`Slide ${k + 1} of ${slides.length}`}
            onClick={() => setI(k)}
            className="flex h-11 w-8 items-center justify-center"
          >
            <span className={cx("block h-2 rounded-full transition-all", k === i ? "w-6 bg-accent" : "w-2 bg-line")} />
          </button>
        ))}
      </div>

      <Button onClick={() => (last ? router.push(signup) : setI(i + 1))}>{last ? "Get started" : "Next"}</Button>
      <Link href={signup} className="mt-3 inline-flex h-11 items-center justify-center text-[15px] text-muted hover:text-ink">
        I already have an account
      </Link>
    </main>
  );
}

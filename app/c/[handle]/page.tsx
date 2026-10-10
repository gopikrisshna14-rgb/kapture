import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProfileByHandle } from "@/lib/session";
import { PublicForm } from "./public-form";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PublicPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const owner = await findProfileByHandle(handle.toLowerCase());
  if (!owner) notFound();
  const name = owner.display_name || "me";
  return (
    <main className="flex min-h-dvh flex-col px-6 pb-10 pt-[max(env(safe-area-inset-top),32px)]">
      <span className="font-display text-[18px] font-extrabold text-muted">Catch</span>
      <h1 className="mt-10 text-[38px] font-extrabold leading-[1.03]">
        Nice to meet you.
        <br />
        I&apos;m {name}.
      </h1>
      {(owner.headline || owner.company) && <p className="mt-2 text-muted">{owner.headline ?? owner.company}</p>}
      <p className="mt-4 text-[16px] text-muted">Leave your details and I&apos;ll be in touch.</p>
      <PublicForm handle={owner.handle!} ownerName={owner.display_name ?? "this person"} linkedinUrl={owner.linkedin_url} />
    </main>
  );
}

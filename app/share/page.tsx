import { requireUser } from "@/lib/server-page";
import { extractLinkedInUrl } from "@/lib/linkedin";
import { ShareCapture } from "./share-capture";

/** Android share target: LinkedIn app -> Share profile -> Catch. LinkedIn usually puts the URL in `text`. */
export default async function SharePage({ searchParams }: { searchParams: Promise<{ url?: string; text?: string; title?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const found = [sp.url, sp.text, sp.title].map((s) => (s ? extractLinkedInUrl(s) : null)).find(Boolean) ?? null;
  const other = !found ? [sp.url, sp.text].map((s) => s?.match(/https?:\/\/\S+/)?.[0]).find(Boolean) ?? null : null;
  return <ShareCapture linkedinUrl={found} otherUrl={other} />;
}

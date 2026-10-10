import { requireUser } from "@/lib/server-page";
import { Scanner } from "./scanner";

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  await requireUser();
  const { mode } = await searchParams;
  return <Scanner initialMode={mode === "card" || mode === "digital" ? mode : "qr"} />;
}

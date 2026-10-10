import { requireUser } from "@/lib/server-page";

export default async function Page() {
  await requireUser();
  return <main className="px-5 pt-6"><h1 className="text-[32px] font-extrabold">Coming next</h1></main>;
}

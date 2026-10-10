import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server-page";
import { isAdmin } from "@/lib/admin";
import { ApifyCheck } from "./apify-check";

export const dynamic = "force-dynamic";

export default async function ApifyPage() {
  await requireUser({ needEvent: false });
  if (!(await isAdmin())) notFound();
  return <ApifyCheck />;
}

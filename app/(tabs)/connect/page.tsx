import { requireUser } from "@/lib/server-page";
import { ConnectQueue } from "./queue";

export default async function ConnectPage() {
  await requireUser();
  return <ConnectQueue />;
}

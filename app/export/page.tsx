import { requireUser } from "@/lib/server-page";
import { getSessionUser } from "@/lib/session";
import { ExportScreen } from "./export-screen";

export default async function ExportPage() {
  const { repo } = await requireUser();
  const user = await getSessionUser();
  const people = await repo.listPeople();
  return (
    <ExportScreen
      email={user?.email ?? null}
      counts={{
        all: people.length,
        priority: people.filter((p) => p.priority === "priority").length,
        not_followed_up: people.filter((p) => !p.followed_up_at).length,
      }}
    />
  );
}

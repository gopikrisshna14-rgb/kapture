import { after } from "next/server";
import { fail, json, withRepo } from "@/lib/api";
import { runEnrichment } from "@/lib/pipeline";
import { repoForUser } from "@/lib/session";

export const maxDuration = 300;

export const POST = withRepo<{ params: Promise<{ id: string }> }>(async (_req, repo, { params }) => {
  const { id } = await params;
  const person = await repo.getPerson(id);
  if (!person) return fail("Not found", 404);
  if (!person.linkedin_url) return fail("There's no profile link to read.");
  await repo.updatePerson(id, { enrichment_status: "pending", enrichment_step: "qr_read" });
  const userId = repo.userId;
  const url = person.linkedin_url;
  after(() => runEnrichment(repoForUser(userId), id, url));
  return json({ ok: true });
});

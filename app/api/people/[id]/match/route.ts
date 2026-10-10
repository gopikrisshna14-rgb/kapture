import { after } from "next/server";
import { fail, json, readJson, withRepo } from "@/lib/api";
import { normalizeLinkedInUrl } from "@/lib/linkedin";
import { runEnrichment } from "@/lib/pipeline";
import { repoForUser } from "@/lib/session";

export const maxDuration = 300;

/** User confirmed ("Yes, that's them") -> link + enrich. Card details stay; enrichment only fills gaps. */
export const POST = withRepo<{ params: Promise<{ id: string }> }>(async (req, repo, { params }) => {
  const { id } = await params;
  const b = await readJson(req);
  const url = normalizeLinkedInUrl(String(b.linkedin_url ?? ""));
  if (!url) return fail("Invalid profile link");
  if (!(await repo.getPerson(id))) return fail("Not found", 404);
  await repo.updatePerson(id, { linkedin_url: url, enrichment_status: "pending", enrichment_step: "profile_found" });
  const userId = repo.userId;
  after(() => runEnrichment(repoForUser(userId), id, url));
  return json({ ok: true });
});

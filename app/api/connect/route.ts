import { json, withRepo } from "@/lib/api";

export const GET = withRepo(async (_req, repo) => {
  const [requests, people] = await Promise.all([repo.listRequests(), repo.listPeople()]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const rows = requests
    .map((r) => {
      const p = byId.get(r.person_id);
      return p
        ? { ...r, full_name: p.full_name, company: p.company, role_title: p.role_title, linkedin_url: p.linkedin_url }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.queued_at.localeCompare(a!.queued_at));
  return json(rows);
});

import { withRepo } from "@/lib/api";

/** "Export all my data": everything Catch holds for this account, as JSON. */
export const GET = withRepo(async (_req, repo) => {
  const [profile, events, people, requests, templates, usage] = await Promise.all([
    repo.getProfile(),
    repo.listEvents(),
    repo.listPeople(),
    repo.listRequests(),
    repo.listTemplates(),
    repo.listUsageEvents(),
  ]);
  const body = JSON.stringify(
    { exported_at: new Date().toISOString(), profile, events, people, connect_requests: requests, note_templates: templates, usage_events: usage },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="catch-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
});

import { withRepo } from "@/lib/api";
import { buildCsv, csvFilename, parseFilter } from "@/lib/export";

export const GET = withRepo(async (req, repo) => {
  const filter = parseFilter(new URL(req.url).searchParams.get("filter"));
  const { csv, count } = await buildCsv(repo, filter);
  await repo.logEvent("export_done", null, { format: "csv", filter, count });
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${csvFilename()}"`,
      "cache-control": "no-store",
    },
  });
});

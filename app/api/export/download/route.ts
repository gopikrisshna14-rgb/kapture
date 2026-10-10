import { fail } from "@/lib/api";
import { buildCsv, csvFilename, verifyExport } from "@/lib/export";
import { repoForUser } from "@/lib/session";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const v = verifyExport(token);
  if (!v) return fail("This download link has expired.", 410);
  const repo = repoForUser(v.userId);
  const { csv, count } = await buildCsv(repo, v.filter);
  await repo.logEvent("export_done", null, { format: "csv_link", filter: v.filter, count });
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${csvFilename()}"`,
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}

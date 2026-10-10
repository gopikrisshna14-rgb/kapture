import { json, readJson, withRepo } from "@/lib/api";
import { parseFilter, signExport } from "@/lib/export";
import { appUrl } from "@/lib/config";

/** Signed, 24-hour download link for "Email it to me". */
export const POST = withRepo(async (req, repo) => {
  const b = await readJson(req);
  const filter = parseFilter(b.filter);
  const origin = req.headers.get("origin") || appUrl();
  return json({ url: `${origin}/api/export/download?token=${signExport(repo.userId, filter)}` });
});

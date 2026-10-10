import { fail, json } from "@/lib/api";
import { expiredPeople, repoForUser } from "@/lib/session";

export const maxDuration = 300;

/** Daily (vercel.json): hard-deletes people whose delete_after has passed, including storage + cache. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return fail("Unauthorized", 401);
  let removed = 0;
  for (const p of await expiredPeople()) {
    await repoForUser(p.user_id).deletePerson(p.id);
    removed++;
  }
  return json({ removed });
}

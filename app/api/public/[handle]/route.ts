import { fail, json, readJson, str } from "@/lib/api";
import { findProfileByHandle, repoForUser } from "@/lib/session";
import { createCapture } from "@/lib/pipeline";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const OWNER_CAP_PER_HOUR = 60;

/** Public, unauthenticated: someone shares their own details with the code's owner. */
export async function POST(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const ip = clientIp(req);
  if (!rateLimit(`pub:ip:${ip}`, 5, 10 * 60_000)) return fail("Too many tries. Please wait a few minutes.", 429);

  const b = await readJson(req);
  if (str(b.website)) return json({ ok: true }); // honeypot: pretend success, store nothing
  const name = str(b.name, 120);
  const email = str(b.email, 254)?.toLowerCase() ?? null;
  if (!name || name.length < 2) return fail("Please add your name.");
  if (!email || !EMAIL.test(email)) return fail("Please add a valid email.");
  if (b.consent !== true) return fail("Please tick the box to agree.");

  const owner = await findProfileByHandle(String(handle).toLowerCase());
  if (!owner) return fail("Not found", 404);
  if (!rateLimit(`pub:owner:${owner.id}`, OWNER_CAP_PER_HOUR, 3600_000)) return fail("Too many submissions right now. Try again later.", 429);

  const repo = repoForUser(owner.id);
  // Durable cap across instances.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const recent = (await repo.listPeople()).filter((p) => p.source === "self_submitted" && p.created_at >= since).length;
  if (recent >= OWNER_CAP_PER_HOUR) return fail("Too many submissions right now. Try again later.", 429);

  await createCapture(repo, {
    source: "self_submitted",
    full_name: name,
    email,
    consent_basis: "self_submitted",
    enrichment_status: "ok",
    enrichment_step: "done",
  });
  return json({ ok: true }, 201);
}

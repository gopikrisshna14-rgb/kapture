import { fail, json, readJson } from "@/lib/api";
import { isAdmin } from "@/lib/admin";
import { isDemoMode } from "@/lib/config";
import { actorInputSchema, profileInput, runActor } from "@/lib/providers/apify";
import { mapProfile, mappingReport } from "@/lib/providers/apify-map";
import { normalizeLinkedInUrl } from "@/lib/linkedin";

export const maxDuration = 300;

const status = () => ({
  token: Boolean(process.env.APIFY_TOKEN),
  actor: process.env.APIFY_PROFILE_ACTOR || null,
  postsActor: process.env.APIFY_POSTS_ACTOR || null,
  searchActor: process.env.APIFY_SEARCH_ACTOR || null,
  inputTemplate: process.env.APIFY_PROFILE_INPUT || null,
  fieldMap: process.env.APIFY_FIELD_MAP || null,
  demoMode: isDemoMode(),
});

/** Config + the actor's input schema. */
export async function GET() {
  if (!(await isAdmin())) return fail("Not found", 404);
  const s = status();
  if (!s.token || !s.actor) return json({ status: s, schema: null });
  try {
    return json({ status: s, schema: await actorInputSchema(s.actor) });
  } catch (e) {
    return json({ status: s, schema: null, error: (e as Error).message });
  }
}

type Shape = string | Shape[] | { [k: string]: Shape };
function shape(v: unknown, depth = 0): Shape {
  if (Array.isArray(v)) return v.length ? [shape(v[0], depth + 1)] : [];
  if (v && typeof v === "object" && depth < 3) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x, depth + 1)]));
  return v === null ? "null" : typeof v;
}

/** Runs the profile actor once on a URL the admin chose; returns the item's shape and the mapped fields. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return fail("Not found", 404);
  const s = status();
  if (!s.token || !s.actor) return fail("Set APIFY_TOKEN and APIFY_PROFILE_ACTOR in Vercel first.");
  const b = await readJson(req);
  const url = normalizeLinkedInUrl(String(b.url ?? ""));
  if (!url) return fail("Paste a LinkedIn profile link.");
  const t0 = Date.now();
  let input: Record<string, unknown> = {};
  try {
    input = await profileInput(s.actor, url);
    const items = await runActor(s.actor, input);
    const item = items.find((i) => !("error" in i)) ?? null;
    const itemError = items.find((i) => "error" in i) as { error?: unknown } | undefined;
    if (!item && itemError) {
      const msg = typeof itemError.error === "string" ? itemError.error : JSON.stringify(itemError.error);
      return json({ seconds: (Date.now() - t0) / 1000, input, error: `The actor ran but returned an error: ${msg}` }, 502);
    }
    if (!item) return json({ seconds: (Date.now() - t0) / 1000, input, items: 0, shape: null, mapping: null, profile: null });
    const { raw: _raw, ...profile } = mapProfile(item, url);
    void _raw;
    return json({ seconds: (Date.now() - t0) / 1000, input, items: items.length, shape: shape(item), mapping: mappingReport(item), profile });
  } catch (e) {
    return json({ seconds: (Date.now() - t0) / 1000, input, error: (e as Error).message }, 502);
  }
}

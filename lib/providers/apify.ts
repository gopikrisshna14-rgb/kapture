import "server-only";
import type { Candidate, NormalizedProfile } from "../types";
import { ProfileProvider, ProviderError } from "./types";
import { mapCandidate, mapPosts, mapProfile } from "./apify-map";
import { inputFromSchema, type InputSchema } from "./apify-input";
export type { InputSchema } from "./apify-input";

// APIFY_API_BASE exists only for tests against a stand-in server.
const API = process.env.APIFY_API_BASE || "https://api.apify.com/v2";
const SYNC_TIMEOUT_S = 280; // run-sync endpoints are capped at 300 s by Apify

/**
 * Fills an input template from env, e.g. APIFY_PROFILE_INPUT='{"profileUrls":["{url}"]}'.
 * The default below is a guess at the actor's input key: confirm it with scripts/apify-inspect.mjs.
 */
export function buildInput(template: string | undefined, fallback: Record<string, unknown>, vars: Record<string, string>) {
  if (!template) return fallback;
  let s = template;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(JSON.stringify(v).slice(1, -1));
  return JSON.parse(s) as Record<string, unknown>;
}

/** Apify's own explanation, e.g. "insufficient credit" or "actor must be rented". */
async function apifyErrorMessage(r: Response): Promise<string> {
  try {
    const d = (await r.json()) as { error?: { message?: string; type?: string } };
    return d.error?.message || d.error?.type || r.statusText;
  } catch {
    return r.statusText || "unknown error";
  }
}

export async function runActor(actor: string, input: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new ProviderError("APIFY_TOKEN missing", "config");
  const id = actor.replace("/", "~");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), (SYNC_TIMEOUT_S + 10) * 1000);
  try {
    const r = await fetch(`${API}/acts/${id}/run-sync-get-dataset-items?timeout=${SYNC_TIMEOUT_S}&format=json&clean=true`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (r.status === 408) throw new ProviderError("Apify run timed out", "timeout");
    if (!r.ok) throw new ProviderError(`Apify ${r.status}: ${await apifyErrorMessage(r)}`, r.status === 401 || r.status === 403 || r.status === 404 ? "config" : "upstream");
    const data = (await r.json()) as unknown;
    return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if ((e as Error).name === "AbortError") throw new ProviderError("Apify request timed out", "timeout");
    throw new ProviderError("Apify request failed", "upstream");
  } finally {
    clearTimeout(t);
  }
}

export class ApifyProvider implements ProfileProvider {
  readonly name = "apify";

  async getProfile(linkedinUrl: string): Promise<NormalizedProfile> {
    const actor = process.env.APIFY_PROFILE_ACTOR!;
    const items = await runActor(actor, await profileInput(actor, linkedinUrl));
    const item = items.find((i) => !("error" in i)) ?? null;
    if (!item) {
      const err = items.find((i) => "error" in i) as { error?: unknown } | undefined;
      const msg = typeof err?.error === "string" ? err.error : (err?.error as { message?: string } | undefined)?.message;
      throw new ProviderError(msg ? `Actor returned an error: ${msg}` : "No profile returned", items.length ? "not_found" : "empty");
    }
    const profile = mapProfile(item, linkedinUrl);

    // Separate posts actor, only if the profile actor returned none.
    const postsActor = process.env.APIFY_POSTS_ACTOR;
    if (postsActor && !profile.recentPosts?.length) {
      try {
        const posts = await runActor(
          postsActor,
          buildInput(process.env.APIFY_POSTS_INPUT, { profileUrls: [linkedinUrl], maxPosts: 5 }, { url: linkedinUrl }),
        );
        profile.recentPosts = mapPosts(posts);
        profile.raw = { profile: item, posts };
      } catch {
        // Posts are optional: a failure here leaves the section empty (status becomes partial).
      }
    }
    return profile;
  }

  async findProfile(q: { name: string; company?: string | null; city?: string | null }): Promise<Candidate[]> {
    const actor = process.env.APIFY_SEARCH_ACTOR;
    if (!actor) return [];
    const query = [q.name, q.company, q.city].filter(Boolean).join(" ");
    const items = await runActor(
      actor,
      buildInput(process.env.APIFY_SEARCH_INPUT, { searchQuery: query, maxResults: 3 }, {
        query,
        name: q.name,
        company: q.company ?? "",
        city: q.city ?? "",
      }),
    );
    return items.map(mapCandidate).filter((c): c is Candidate => c !== null).slice(0, 3);
  }
}

const schemaCache = new Map<string, { at: number; schema: InputSchema }>();

/** The actor's input schema (names, types, prefill), cached for an hour per server instance. */
export async function actorInputSchema(actor: string): Promise<InputSchema> {
  const hit = schemaCache.get(actor);
  if (hit && Date.now() - hit.at < 3600_000) return hit.schema;
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new ProviderError("APIFY_TOKEN missing", "config");
  const h = { authorization: `Bearer ${token}` };
  const act = await fetch(`${API}/acts/${actor.replace("/", "~")}`, { headers: h, cache: "no-store" });
  if (act.status === 401) throw new ProviderError("Apify rejected the token. Check APIFY_TOKEN in Vercel.", "config");
  if (act.status === 404) throw new ProviderError("Actor not found. Check APIFY_PROFILE_ACTOR (format: user/actor-name).", "config");
  if (!act.ok) throw new ProviderError(`Apify ${act.status}: ${await apifyErrorMessage(act)}`, "upstream");
  const a = (await act.json()) as { data?: { title?: string; taggedBuilds?: { latest?: { buildId?: string } } } };
  const buildId = a.data?.taggedBuilds?.latest?.buildId;
  let schema: InputSchema = { title: a.data?.title, properties: [], required: [] };
  if (buildId) {
    const b = (await (await fetch(`${API}/actor-builds/${buildId}`, { headers: h, cache: "no-store" })).json()) as { data?: { inputSchema?: string } };
    const raw = b.data?.inputSchema
      ? (JSON.parse(b.data.inputSchema) as { properties?: Record<string, { type?: string; title?: string; editor?: string; prefill?: unknown; default?: unknown }>; required?: string[] })
      : {};
    schema = {
      title: a.data?.title,
      properties: Object.entries(raw.properties ?? {}).map(([key, v]) => ({ key, type: v.type ?? "?", title: v.title, editor: v.editor, prefill: v.prefill, default: v.default })),
      required: raw.required ?? [],
    };
  }
  schemaCache.set(actor, { at: Date.now(), schema });
  return schema;
}

/** APIFY_PROFILE_INPUT wins; otherwise the field is found from the actor's schema; last resort {profileUrls}. */
export async function profileInput(actor: string, url: string): Promise<Record<string, unknown>> {
  if (process.env.APIFY_PROFILE_INPUT) return buildInput(process.env.APIFY_PROFILE_INPUT, {}, { url });
  try {
    const auto = inputFromSchema(await actorInputSchema(actor), url);
    if (auto) return auto;
  } catch (e) {
    if (e instanceof ProviderError && e.kind === "config") throw e;
  }
  return { profileUrls: [url] };
}

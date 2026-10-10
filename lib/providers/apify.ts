import "server-only";
import type { Candidate, NormalizedProfile } from "../types";
import { ProfileProvider, ProviderError } from "./types";
import { mapCandidate, mapPosts, mapProfile } from "./apify-map";

const API = "https://api.apify.com/v2";
const SYNC_TIMEOUT_S = 280; // run-sync endpoints are capped at 300 s by Apify

/**
 * Fills an input template from env, e.g. APIFY_PROFILE_INPUT='{"profileUrls":["{url}"]}'.
 * The default below is a guess at the actor's input key: confirm it with scripts/apify-inspect.mjs.
 */
function buildInput(template: string | undefined, fallback: Record<string, unknown>, vars: Record<string, string>) {
  if (!template) return fallback;
  let s = template;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(JSON.stringify(v).slice(1, -1));
  return JSON.parse(s) as Record<string, unknown>;
}

async function runActor(actor: string, input: Record<string, unknown>): Promise<Record<string, unknown>[]> {
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
    if (!r.ok) throw new ProviderError(`Apify ${r.status}`, "upstream");
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
    const items = await runActor(
      actor,
      buildInput(process.env.APIFY_PROFILE_INPUT, { profileUrls: [linkedinUrl] }, { url: linkedinUrl }),
    );
    const item = items.find((i) => !("error" in i)) ?? null;
    if (!item) throw new ProviderError("No profile returned", items.length ? "not_found" : "empty");
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

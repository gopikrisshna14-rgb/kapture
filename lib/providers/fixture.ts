import type { Candidate, NormalizedProfile } from "../types";
import { FIXTURE_PROFILES, POOL } from "./fixtures";
import { ProfileProvider, ProviderError } from "./types";
import { slugLabel } from "../linkedin";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Demo provider: realistic fixtures with realistic delays. Slugs containing "private" or "fail" fail. */
export class FixtureProvider implements ProfileProvider {
  readonly name = "fixtures";

  async getProfile(linkedinUrl: string): Promise<NormalizedProfile> {
    await sleep(1600);
    const slug = slugLabel(linkedinUrl).toLowerCase();
    if (/private|fail/.test(slug)) throw new ProviderError("Profile not readable", "not_found");
    let p = FIXTURE_PROFILES[slug];
    if (!p) {
      const m = slug.match(/^(.+)--(.+)-match$/);
      if (m) {
        // A candidate created by findProfile below: name and company come from the card itself.
        const base = FIXTURE_PROFILES[POOL[hash(slug) % POOL.length]];
        p = {
          ...base,
          name: decodeURIComponent(m[1]).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          company: undefined,
          headline: undefined,
          experience: undefined,
        };
      } else {
        p = FIXTURE_PROFILES[POOL[hash(slug) % POOL.length]];
      }
    }
    return { ...structuredClone(p), linkedinUrl, raw: { fixture: true, slug } };
  }

  async findProfile(q: { name: string; company?: string | null; city?: string | null }): Promise<Candidate[]> {
    await sleep(900);
    if (!q.name?.trim()) return [];
    const known = Object.entries(FIXTURE_PROFILES).find(([, p]) => p.name?.toLowerCase() === q.name.trim().toLowerCase());
    if (known) {
      const [slug, p] = known;
      return [
        {
          linkedinUrl: `https://www.linkedin.com/in/${slug}`,
          name: p.name,
          headline: p.headline,
          company: p.company,
          location: p.location,
        },
      ];
    }
    // Same name, but no company or city on record: only a weak match.
    return [
      {
        linkedinUrl: `https://www.linkedin.com/in/${slugify(q.name)}--${slugify(q.company ?? "x")}-match`,
        name: q.name.trim(),
        location: undefined,
        company: undefined,
      },
    ];
  }
}

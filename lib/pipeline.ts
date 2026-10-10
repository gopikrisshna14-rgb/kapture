import "server-only";
import type { Repo, PersonInsert } from "./db/repo";
import type { EnrichmentStatus, NormalizedProfile, Person, Source, ConsentBasis } from "./types";
import { getProfileProvider } from "./providers";
import { writeBrief } from "./ai";
import { completeness, hasValue } from "./grounding";
import { firstNameOf } from "./linkedin";

const CACHE_DAYS = 30;
const PROFILE_TIMEOUT_MS = 290_000;

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);
export const addMonths = (d: Date, n: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Every capture source ends here: normalised input -> people row in the current event. */
export async function createCapture(
  repo: Repo,
  input: Omit<PersonInsert, "source"> & { source: Source; consent_basis?: ConsentBasis | null },
): Promise<Person> {
  const profile = await repo.getProfile();
  const event = profile?.current_event_id ? await repo.getEvent(profile.current_event_id) : null;
  const now = new Date();
  const delay = event?.followup_delay_days ?? 2;
  const person = await repo.createPerson({
    event_id: event?.id ?? null,
    followup_due: isoDate(addDays(now, delay)),
    delete_after: profile?.auto_delete_months ? addMonths(now, profile.auto_delete_months).toISOString() : null,
    consent_at: input.consent_basis ? now.toISOString() : null,
    ...input,
    first_name: input.first_name ?? firstNameOf(input.full_name),
  });
  return person;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([p, new Promise<T>((_, rej) => (t = setTimeout(() => rej(new Error("timeout")), ms)))]);
  } finally {
    clearTimeout(t);
  }
}

/** The core fields we need to call enrichment "ok". Anything less is "partial". */
function statusFor(p: NormalizedProfile): EnrichmentStatus {
  const core = [p.name, p.headline ?? p.role, p.company].filter(hasValue).length;
  if (core === 0) return "failed";
  const deep = [p.experience, p.about, p.recentPosts].filter(hasValue).length;
  return core === 3 && deep >= 1 ? "ok" : "partial";
}

/**
 * Fetch the profile (cached 30 days), fill empty person fields, copy the photo, write the brief.
 * Never throws and never deletes: a failure only marks the person as failed so screen 13 can show.
 */
export async function runEnrichment(repo: Repo, personId: string, linkedinUrl: string): Promise<void> {
  const step = (enrichment_step: Person["enrichment_step"]) => repo.updatePerson(personId, { enrichment_step }).catch(() => null);
  let profile: NormalizedProfile | null = null;
  try {
    await step("qr_read");
    profile = await repo.getCachedProfile(linkedinUrl, CACHE_DAYS);
    if (!profile) {
      profile = await withTimeout(getProfileProvider().getProfile(linkedinUrl), PROFILE_TIMEOUT_MS);
      await repo.setCachedProfile(linkedinUrl, profile);
    }
    await step("profile_found");
  } catch (e) {
    const kind = (e as { kind?: string }).kind ?? ((e as Error).message === "timeout" ? "timeout" : "error");
    await repo.updatePerson(personId, { enrichment_status: "failed", enrichment_step: "done" }).catch(() => null);
    await repo.logEvent("enrichment_failed", personId, { reason: kind });
    return;
  }

  const person = await repo.getPerson(personId);
  if (!person) return; // deleted while we were fetching
  await step("reading");

  // Only fill what is empty: details the user typed or that came from a card always win.
  const patch: Partial<Person> = { raw_enrichment: profile };
  const fill = <K extends keyof Person>(k: K, v: Person[K] | undefined) => {
    if (v !== undefined && v !== null && v !== "" && !person[k]) patch[k] = v;
  };
  fill("full_name", profile.name ?? null);
  fill("first_name", firstNameOf(profile.name));
  fill("headline", profile.headline ?? null);
  fill("role_title", profile.role ?? null);
  fill("company", profile.company ?? null);
  fill("location", profile.location ?? null);
  if (!person.consent_basis) {
    patch.consent_basis = "public_profile";
    patch.consent_at = new Date().toISOString();
  }

  if (profile.photoUrl && !person.photo_path) {
    try {
      const r = await withTimeout(fetch(profile.photoUrl, { cache: "no-store" }), 10_000);
      const type = r.headers.get("content-type") ?? "";
      if (r.ok && type.startsWith("image/")) {
        const buf = await r.arrayBuffer();
        if (buf.byteLength < 3_000_000) patch.photo_path = await repo.uploadPhoto(personId, buf, type);
      }
    } catch {
      // Photo is optional.
    }
  }
  await repo.updatePerson(personId, patch);

  await step("writing_brief");
  let status = statusFor(profile);
  try {
    const brief = await writeBrief(profile);
    await repo.updatePerson(personId, { brief });
  } catch {
    if (status === "ok") status = "partial";
  }
  await repo.updatePerson(personId, { enrichment_status: status, enrichment_step: "done" });
  await repo.logEvent(`enrichment_${status}`, personId, null);
  await repo.logEvent("profile_completeness", personId, { value: completeness(profile) });
}

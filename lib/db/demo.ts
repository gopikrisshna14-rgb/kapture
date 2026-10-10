import "server-only";
import { randomUUID } from "node:crypto";
import type { Repo, PersonInsert, PersonPatch } from "./repo";
import type { ConnectRequest, EventRow, NormalizedProfile, NoteTemplate, Person, Profile, UsageEvent } from "../types";
import { keys, kv, putRow, row, rows } from "./demo-store";

const now = () => new Date().toISOString();

export function blankPerson(userId: string, p: PersonInsert): Person {
  return {
    id: randomUUID(),
    user_id: userId,
    event_id: null,
    full_name: null,
    first_name: null,
    headline: null,
    role_title: null,
    company: null,
    location: null,
    email: null,
    phone: null,
    website: null,
    linkedin_url: null,
    photo_path: null,
    priority: "just_met",
    notes: null,
    voice_transcript: null,
    ai_summary: null,
    next_steps: null,
    brief: null,
    raw_enrichment: null,
    enrichment_status: "pending",
    enrichment_step: null,
    consent_basis: null,
    consent_at: null,
    delete_after: null,
    followup_due: null,
    followed_up_at: null,
    created_at: now(),
    ...p,
  };
}

interface CacheRow {
  linkedin_url: string;
  profile: NormalizedProfile;
  fetched_at: string;
}

const byNewest = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);

/** Demo-mode repo: one hash per table per user in the demo KV store. */
export class DemoRepo implements Repo {
  constructor(readonly userId: string) {}
  private k = (table: string) => keys.table(table, this.userId);

  async getProfile() {
    return row<Profile>(keys.profiles, this.userId);
  }
  async updateProfile(patch: Partial<Profile>) {
    const existing = await this.getProfile();
    const p: Profile = {
      id: this.userId,
      display_name: null,
      headline: null,
      company: null,
      linkedin_url: null,
      handle: null,
      purpose: "selling",
      max_note_length: 200,
      connect_mode: "assisted",
      auto_delete_months: 12,
      current_event_id: null,
      ai_personalise: true,
      created_at: now(),
      ...existing,
      ...patch,
    };
    p.id = this.userId;
    if (existing?.handle && existing.handle !== p.handle) await kv().hdel(keys.handles, existing.handle);
    if (p.handle) await kv().hset(keys.handles, p.handle, this.userId);
    await putRow(keys.profiles, this.userId, p);
    if (!existing) await kv().hset(keys.users, this.userId, "1");
    return p;
  }
  async isHandleTaken(handle: string) {
    const owner = await kv().hget(keys.handles, handle);
    return Boolean(owner && owner !== this.userId);
  }

  async listEvents() {
    return (await rows<EventRow>(this.k("events"))).sort(byNewest);
  }
  async getEvent(id: string) {
    return row<EventRow>(this.k("events"), id);
  }
  async createEvent(e: Pick<EventRow, "name" | "event_date" | "followup_delay_days">) {
    const r: EventRow = { id: randomUUID(), user_id: this.userId, created_at: now(), ...e };
    await putRow(this.k("events"), r.id, r);
    return r;
  }

  async listPeople() {
    return (await rows<Person>(this.k("people"))).sort(byNewest);
  }
  async getPerson(id: string) {
    return row<Person>(this.k("people"), id);
  }
  async createPerson(p: PersonInsert) {
    const r = blankPerson(this.userId, p);
    await putRow(this.k("people"), r.id, r);
    return r;
  }
  async updatePerson(id: string, patch: PersonPatch) {
    // Read right before writing so concurrent updates (background enrichment vs. the review screen) rarely clash.
    const current = await this.getPerson(id);
    if (!current) throw new Error("not_found");
    const next = { ...current, ...patch, id, user_id: this.userId };
    await putRow(this.k("people"), id, next);
    return next;
  }
  async deletePerson(id: string) {
    const p = await this.getPerson(id);
    if (!p) return;
    await kv().hdel(this.k("people"), id);
    await kv().hdel(this.k("connect_requests"), id);
    if (p.linkedin_url) await kv().hdel(this.k("enrichment_cache"), p.linkedin_url);
    if (p.photo_path) await kv().hdel(this.k("photos"), p.photo_path);
  }
  async countCapturesSince(since: Date) {
    const s = since.toISOString();
    return (await this.listPeople()).filter((p) => p.source !== "self_submitted" && p.created_at >= s).length;
  }

  // Connect requests are keyed by person id (one request per person).
  async listRequests() {
    return rows<ConnectRequest>(this.k("connect_requests"));
  }
  async getRequestForPerson(personId: string) {
    return row<ConnectRequest>(this.k("connect_requests"), personId);
  }
  async upsertRequest(personId: string, patch: Partial<ConnectRequest>) {
    if (!(await this.getPerson(personId))) throw new Error("not_found");
    const existing = await this.getRequestForPerson(personId);
    const r: ConnectRequest = {
      id: existing?.id ?? randomUUID(),
      note: null,
      mode: "assisted",
      status: "queued",
      queued_at: now(),
      sent_at: null,
      accepted_at: null,
      ...existing,
      ...patch,
      person_id: personId,
      user_id: this.userId,
    };
    await putRow(this.k("connect_requests"), personId, r);
    return r;
  }
  async deleteRequestForPerson(personId: string) {
    await kv().hdel(this.k("connect_requests"), personId);
  }

  async listTemplates() {
    return (await rows<NoteTemplate>(this.k("note_templates"))).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }
  async createTemplate(t: Pick<NoteTemplate, "name" | "body" | "is_default">) {
    const r: NoteTemplate = { id: randomUUID(), user_id: this.userId, ...t };
    await putRow(this.k("note_templates"), r.id, r);
    return r;
  }
  async updateTemplate(id: string, patch: Partial<NoteTemplate>) {
    const t = await row<NoteTemplate>(this.k("note_templates"), id);
    if (!t) throw new Error("not_found");
    const r = { ...t, ...patch, id, user_id: this.userId };
    await putRow(this.k("note_templates"), id, r);
    return r;
  }
  async deleteTemplate(id: string) {
    await kv().hdel(this.k("note_templates"), id);
  }

  async logEvent(event: string, personId?: string | null, meta?: Record<string, unknown> | null) {
    const e: UsageEvent = { id: Date.now() * 1000 + Math.floor(Math.random() * 1000), user_id: this.userId, event, person_id: personId ?? null, meta: meta ?? null, at: now() };
    await putRow(this.k("usage_events"), String(e.id), e);
  }
  async listUsageEvents() {
    return (await rows<UsageEvent>(this.k("usage_events"))).sort((a, b) => a.at.localeCompare(b.at));
  }

  async getCachedProfile(linkedinUrl: string, maxAgeDays: number) {
    const c = await row<CacheRow>(this.k("enrichment_cache"), linkedinUrl);
    if (!c || Date.now() - Date.parse(c.fetched_at) > maxAgeDays * 86400_000) return null;
    return c.profile;
  }
  async setCachedProfile(linkedinUrl: string, profile: NormalizedProfile) {
    await putRow(this.k("enrichment_cache"), linkedinUrl, { linkedin_url: linkedinUrl, profile, fetched_at: now() });
  }

  async uploadPhoto(personId: string, bytes: ArrayBuffer, contentType: string) {
    const key = `${this.userId}/${personId}`;
    await putRow(this.k("photos"), key, { contentType, base64: Buffer.from(bytes).toString("base64") });
    return key;
  }
  async photoUrl(path: string) {
    const p = await row<{ contentType: string; base64: string }>(this.k("photos"), path);
    return p ? `data:${p.contentType};base64,${p.base64}` : null;
  }
}

// ---- Cross-user lookups (public page, admin, cron) ----

export async function demoUserIds(): Promise<string[]> {
  return Object.keys(await kv().hgetall(keys.users));
}
export async function demoProfileByHandle(handle: string): Promise<Profile | null> {
  const uid = await kv().hget(keys.handles, handle);
  return uid ? row<Profile>(keys.profiles, uid) : null;
}

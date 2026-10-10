import { randomUUID } from "node:crypto";
import type { Repo, PersonInsert, PersonPatch } from "./repo";
import type { ConnectRequest, EventRow, NoteTemplate, Person, Profile } from "../types";
import { db, persist } from "./demo-store";

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

export class DemoRepo implements Repo {
  constructor(readonly userId: string) {}

  async getProfile() {
    return db().profiles.find((p) => p.id === this.userId) ?? null;
  }
  async updateProfile(patch: Partial<Profile>) {
    const d = db();
    let p = d.profiles.find((x) => x.id === this.userId);
    if (!p) {
      p = {
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
      };
      d.profiles.push(p);
    }
    Object.assign(p, patch, { id: this.userId });
    persist();
    return { ...p };
  }
  async isHandleTaken(handle: string) {
    return db().profiles.some((p) => p.handle === handle && p.id !== this.userId);
  }

  async listEvents() {
    return db()
      .events.filter((e) => e.user_id === this.userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async getEvent(id: string) {
    return db().events.find((e) => e.id === id && e.user_id === this.userId) ?? null;
  }
  async createEvent(e: Pick<EventRow, "name" | "event_date" | "followup_delay_days">) {
    const row: EventRow = { id: randomUUID(), user_id: this.userId, created_at: now(), ...e };
    db().events.push(row);
    persist();
    return row;
  }

  async listPeople() {
    return db()
      .people.filter((p) => p.user_id === this.userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async getPerson(id: string) {
    return db().people.find((p) => p.id === id && p.user_id === this.userId) ?? null;
  }
  async createPerson(p: PersonInsert) {
    const row = blankPerson(this.userId, p);
    db().people.push(row);
    persist();
    return row;
  }
  async updatePerson(id: string, patch: PersonPatch) {
    const row = await this.getPerson(id);
    if (!row) throw new Error("not_found");
    Object.assign(row, patch);
    persist();
    return { ...row };
  }
  async deletePerson(id: string) {
    const d = db();
    const row = await this.getPerson(id);
    if (!row) return;
    d.people = d.people.filter((p) => p.id !== id);
    d.connect_requests = d.connect_requests.filter((r) => r.person_id !== id);
    if (row.linkedin_url) {
      d.enrichment_cache = d.enrichment_cache.filter(
        (c) => !(c.user_id === this.userId && c.linkedin_url === row.linkedin_url),
      );
    }
    if (row.photo_path) delete d.photos[row.photo_path];
    persist();
  }
  async countCapturesSince(since: Date) {
    const s = since.toISOString();
    return db().people.filter(
      (p) => p.user_id === this.userId && p.source !== "self_submitted" && p.created_at >= s,
    ).length;
  }

  async listRequests() {
    return db().connect_requests.filter((r) => r.user_id === this.userId);
  }
  async getRequestForPerson(personId: string) {
    return db().connect_requests.find((r) => r.person_id === personId && r.user_id === this.userId) ?? null;
  }
  async upsertRequest(personId: string, patch: Partial<ConnectRequest>) {
    if (!(await this.getPerson(personId))) throw new Error("not_found");
    let r = await this.getRequestForPerson(personId);
    if (!r) {
      r = {
        id: randomUUID(),
        person_id: personId,
        user_id: this.userId,
        note: null,
        mode: "assisted",
        status: "queued",
        queued_at: now(),
        sent_at: null,
        accepted_at: null,
      };
      db().connect_requests.push(r);
    }
    Object.assign(r, patch, { person_id: personId, user_id: this.userId });
    persist();
    return { ...r };
  }
  async deleteRequestForPerson(personId: string) {
    const d = db();
    d.connect_requests = d.connect_requests.filter((r) => !(r.person_id === personId && r.user_id === this.userId));
    persist();
  }

  async listTemplates() {
    return db().note_templates.filter((t) => t.user_id === this.userId);
  }
  async createTemplate(t: Pick<NoteTemplate, "name" | "body" | "is_default">) {
    const row: NoteTemplate = { id: randomUUID(), user_id: this.userId, ...t };
    db().note_templates.push(row);
    persist();
    return row;
  }
  async updateTemplate(id: string, patch: Partial<NoteTemplate>) {
    const t = db().note_templates.find((x) => x.id === id && x.user_id === this.userId);
    if (!t) throw new Error("not_found");
    Object.assign(t, patch, { id, user_id: this.userId });
    persist();
    return { ...t };
  }
  async deleteTemplate(id: string) {
    const d = db();
    d.note_templates = d.note_templates.filter((t) => !(t.id === id && t.user_id === this.userId));
    persist();
  }

  async logEvent(event: string, personId?: string | null, meta?: Record<string, unknown> | null) {
    const d = db();
    d.usage_events.push({
      id: d.usage_events.length + 1,
      user_id: this.userId,
      event,
      person_id: personId ?? null,
      meta: meta ?? null,
      at: now(),
    });
    persist();
  }
  async listUsageEvents() {
    return db().usage_events.filter((e) => e.user_id === this.userId);
  }

  async getCachedProfile(linkedinUrl: string, maxAgeDays: number) {
    const c = db().enrichment_cache.find((x) => x.user_id === this.userId && x.linkedin_url === linkedinUrl);
    if (!c) return null;
    if (Date.now() - Date.parse(c.fetched_at) > maxAgeDays * 86400_000) return null;
    return c.profile;
  }
  async setCachedProfile(linkedinUrl: string, profile: Parameters<Repo["setCachedProfile"]>[1]) {
    const d = db();
    d.enrichment_cache = d.enrichment_cache.filter(
      (x) => !(x.user_id === this.userId && x.linkedin_url === linkedinUrl),
    );
    d.enrichment_cache.push({ user_id: this.userId, linkedin_url: linkedinUrl, profile, fetched_at: now() });
    persist();
  }

  async uploadPhoto(personId: string, bytes: ArrayBuffer, contentType: string) {
    const key = `${this.userId}/${personId}`;
    db().photos[key] = { contentType, base64: Buffer.from(bytes).toString("base64") };
    persist();
    return key;
  }
  async photoUrl(path: string) {
    const p = db().photos[path];
    return p ? `data:${p.contentType};base64,${p.base64}` : null;
  }
}

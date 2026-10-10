import type { SupabaseClient } from "@supabase/supabase-js";
import type { Repo, PersonInsert, PersonPatch } from "./repo";
import type { ConnectRequest, EventRow, NormalizedProfile, NoteTemplate, Person, Profile, UsageEvent } from "../types";

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/**
 * Works with either the user's RLS client or the service-role client.
 * Every query also filters by user_id explicitly, so the service-role path stays scoped.
 */
export class SupabaseRepo implements Repo {
  constructor(
    private sb: SupabaseClient,
    readonly userId: string,
    /** Optional service-role client, only for checks that must see across users (handle uniqueness). */
    private admin?: SupabaseClient,
  ) {}

  async getProfile() {
    const r = await this.sb.from("profiles").select("*").eq("id", this.userId).maybeSingle();
    return check(r) as Profile | null;
  }
  async updateProfile(patch: Partial<Profile>) {
    const { id: _id, created_at: _c, email: _e, ...rest } = patch as Profile;
    void _id; void _c; void _e;
    const r = await this.sb.from("profiles").update(rest).eq("id", this.userId).select("*").single();
    return check(r) as Profile;
  }
  async isHandleTaken(handle: string) {
    // RLS hides other users' profiles; without the admin client the unique index still protects us.
    const r = await (this.admin ?? this.sb).from("profiles").select("id").eq("handle", handle).neq("id", this.userId).limit(1);
    return (check(r) as unknown[]).length > 0;
  }

  async listEvents() {
    const r = await this.sb.from("events").select("*").eq("user_id", this.userId).order("created_at", { ascending: false });
    return check(r) as EventRow[];
  }
  async getEvent(id: string) {
    const r = await this.sb.from("events").select("*").eq("user_id", this.userId).eq("id", id).maybeSingle();
    return check(r) as EventRow | null;
  }
  async createEvent(e: Pick<EventRow, "name" | "event_date" | "followup_delay_days">) {
    const r = await this.sb.from("events").insert({ ...e, user_id: this.userId }).select("*").single();
    return check(r) as EventRow;
  }

  async listPeople() {
    const r = await this.sb.from("people").select("*").eq("user_id", this.userId).order("created_at", { ascending: false });
    return check(r) as Person[];
  }
  async getPerson(id: string) {
    const r = await this.sb.from("people").select("*").eq("user_id", this.userId).eq("id", id).maybeSingle();
    return check(r) as Person | null;
  }
  async createPerson(p: PersonInsert) {
    const r = await this.sb.from("people").insert({ ...p, user_id: this.userId }).select("*").single();
    return check(r) as Person;
  }
  async updatePerson(id: string, patch: PersonPatch) {
    const r = await this.sb.from("people").update(patch).eq("user_id", this.userId).eq("id", id).select("*").single();
    return check(r) as Person;
  }
  async deletePerson(id: string) {
    const person = await this.getPerson(id);
    if (!person) return;
    if (person.photo_path) {
      const s = await this.sb.storage.from("photos").remove([person.photo_path]);
      if (s.error) throw new Error(s.error.message);
    }
    if (person.linkedin_url) {
      check(
        await this.sb.from("enrichment_cache").delete().eq("user_id", this.userId).eq("linkedin_url", person.linkedin_url),
      );
    }
    // connect_requests cascade with the person row.
    check(await this.sb.from("people").delete().eq("user_id", this.userId).eq("id", id));
  }
  async countCapturesSince(since: Date) {
    const r = await this.sb
      .from("people")
      .select("id", { count: "exact", head: true })
      .eq("user_id", this.userId)
      .neq("source", "self_submitted")
      .gte("created_at", since.toISOString());
    if (r.error) throw new Error(r.error.message);
    return r.count ?? 0;
  }

  async listRequests() {
    const r = await this.sb.from("connect_requests").select("*").eq("user_id", this.userId);
    return check(r) as ConnectRequest[];
  }
  async getRequestForPerson(personId: string) {
    const r = await this.sb
      .from("connect_requests")
      .select("*")
      .eq("user_id", this.userId)
      .eq("person_id", personId)
      .maybeSingle();
    return check(r) as ConnectRequest | null;
  }
  async upsertRequest(personId: string, patch: Partial<ConnectRequest>) {
    const existing = await this.getRequestForPerson(personId);
    const { id: _i, user_id: _u, person_id: _p, ...rest } = patch;
    void _i; void _u; void _p;
    if (existing) {
      const r = await this.sb.from("connect_requests").update(rest).eq("id", existing.id).eq("user_id", this.userId).select("*").single();
      return check(r) as ConnectRequest;
    }
    const r = await this.sb
      .from("connect_requests")
      .insert({ ...rest, person_id: personId, user_id: this.userId })
      .select("*")
      .single();
    return check(r) as ConnectRequest;
  }
  async deleteRequestForPerson(personId: string) {
    check(await this.sb.from("connect_requests").delete().eq("user_id", this.userId).eq("person_id", personId));
  }

  async listTemplates() {
    const r = await this.sb.from("note_templates").select("*").eq("user_id", this.userId).order("name");
    return check(r) as NoteTemplate[];
  }
  async createTemplate(t: Pick<NoteTemplate, "name" | "body" | "is_default">) {
    const r = await this.sb.from("note_templates").insert({ ...t, user_id: this.userId }).select("*").single();
    return check(r) as NoteTemplate;
  }
  async updateTemplate(id: string, patch: Partial<NoteTemplate>) {
    const { id: _i, user_id: _u, ...rest } = patch;
    void _i; void _u;
    const r = await this.sb.from("note_templates").update(rest).eq("user_id", this.userId).eq("id", id).select("*").single();
    return check(r) as NoteTemplate;
  }
  async deleteTemplate(id: string) {
    check(await this.sb.from("note_templates").delete().eq("user_id", this.userId).eq("id", id));
  }

  async logEvent(event: string, personId?: string | null, meta?: Record<string, unknown> | null) {
    // Telemetry must never break the user's flow.
    await this.sb.from("usage_events").insert({ user_id: this.userId, event, person_id: personId ?? null, meta: meta ?? null });
  }
  async listUsageEvents() {
    const r = await this.sb.from("usage_events").select("*").eq("user_id", this.userId);
    return check(r) as UsageEvent[];
  }

  async getCachedProfile(linkedinUrl: string, maxAgeDays: number) {
    const since = new Date(Date.now() - maxAgeDays * 86400_000).toISOString();
    const r = await this.sb
      .from("enrichment_cache")
      .select("profile")
      .eq("user_id", this.userId)
      .eq("linkedin_url", linkedinUrl)
      .gte("fetched_at", since)
      .maybeSingle();
    const row = check(r) as { profile: NormalizedProfile } | null;
    return row?.profile ?? null;
  }
  async setCachedProfile(linkedinUrl: string, profile: NormalizedProfile) {
    check(
      await this.sb
        .from("enrichment_cache")
        .upsert({ user_id: this.userId, linkedin_url: linkedinUrl, profile, fetched_at: new Date().toISOString() }),
    );
  }

  async uploadPhoto(personId: string, bytes: ArrayBuffer, contentType: string) {
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const path = `${this.userId}/${personId}.${ext}`;
    const r = await this.sb.storage.from("photos").upload(path, bytes, { contentType, upsert: true });
    if (r.error) throw new Error(r.error.message);
    return path;
  }
  async photoUrl(path: string) {
    const r = await this.sb.storage.from("photos").createSignedUrl(path, 3600);
    return r.data?.signedUrl ?? null;
  }
}

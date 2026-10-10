import type {
  ConnectRequest,
  EventRow,
  NormalizedProfile,
  NoteTemplate,
  Person,
  Profile,
  UsageEvent,
} from "../types";

export type PersonInsert = Partial<Omit<Person, "id" | "user_id" | "created_at">> & Pick<Person, "source">;
export type PersonPatch = Partial<Omit<Person, "id" | "user_id" | "created_at">>;

/**
 * Everything the app reads or writes for one signed-in user.
 * Implementations: DemoRepo (JSON file, zero keys) and SupabaseRepo (Postgres + RLS).
 * Every method is scoped to `userId`; nothing here can reach another user's rows.
 */
export interface Repo {
  readonly userId: string;

  getProfile(): Promise<Profile | null>;
  updateProfile(patch: Partial<Omit<Profile, "id" | "created_at">>): Promise<Profile>;
  isHandleTaken(handle: string): Promise<boolean>;

  listEvents(): Promise<EventRow[]>;
  getEvent(id: string): Promise<EventRow | null>;
  createEvent(e: Pick<EventRow, "name" | "event_date" | "followup_delay_days">): Promise<EventRow>;

  listPeople(): Promise<Person[]>;
  getPerson(id: string): Promise<Person | null>;
  createPerson(p: PersonInsert): Promise<Person>;
  updatePerson(id: string, patch: PersonPatch): Promise<Person>;
  /** Hard delete: row, connect request, cached enrichment, stored photo. */
  deletePerson(id: string): Promise<void>;
  countCapturesSince(since: Date): Promise<number>;

  listRequests(): Promise<ConnectRequest[]>;
  getRequestForPerson(personId: string): Promise<ConnectRequest | null>;
  upsertRequest(personId: string, patch: Partial<ConnectRequest>): Promise<ConnectRequest>;
  deleteRequestForPerson(personId: string): Promise<void>;

  listTemplates(): Promise<NoteTemplate[]>;
  createTemplate(t: Pick<NoteTemplate, "name" | "body" | "is_default">): Promise<NoteTemplate>;
  updateTemplate(id: string, patch: Partial<NoteTemplate>): Promise<NoteTemplate>;
  deleteTemplate(id: string): Promise<void>;

  logEvent(event: string, personId?: string | null, meta?: Record<string, unknown> | null): Promise<void>;
  listUsageEvents(): Promise<UsageEvent[]>;

  getCachedProfile(linkedinUrl: string, maxAgeDays: number): Promise<NormalizedProfile | null>;
  setCachedProfile(linkedinUrl: string, profile: NormalizedProfile): Promise<void>;

  uploadPhoto(personId: string, bytes: ArrayBuffer, contentType: string): Promise<string>;
  photoUrl(path: string): Promise<string | null>;
}

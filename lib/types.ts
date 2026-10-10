export type Purpose = "selling" | "hiring" | "networking";
export type Priority = "priority" | "follow_up" | "just_met";
export type Source = "linkedin_qr" | "card" | "digital_card" | "link" | "manual" | "self_submitted";
export type EnrichmentStatus = "pending" | "ok" | "partial" | "failed";
export type ConsentBasis = "public_profile" | "card_given" | "self_submitted";
export type ConnectStatus = "queued" | "sent" | "accepted";
export type EnrichmentStep = "qr_read" | "profile_found" | "reading" | "writing_brief" | "done";

export interface Profile {
  id: string;
  display_name: string | null;
  headline: string | null;
  company: string | null;
  linkedin_url: string | null;
  handle: string | null;
  purpose: Purpose;
  max_note_length: number;
  connect_mode: "assisted" | "direct";
  auto_delete_months: number | null;
  current_event_id: string | null;
  email?: string | null;
  created_at: string;
}

export interface EventRow {
  id: string;
  user_id: string;
  name: string;
  event_date: string;
  followup_delay_days: number;
  created_at: string;
}

export interface Starter {
  text: string;
  source_field: string;
}

export interface Brief {
  in_short: string | null;
  starters: Starter[];
}

export interface Person {
  id: string;
  user_id: string;
  event_id: string | null;
  source: Source;
  full_name: string | null;
  first_name: string | null;
  headline: string | null;
  role_title: string | null;
  company: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  website?: string | null;
  linkedin_url: string | null;
  photo_path: string | null;
  priority: Priority;
  notes: string | null;
  voice_transcript: string | null;
  ai_summary: string | null;
  next_steps: string[] | null;
  brief: Brief | null;
  raw_enrichment: NormalizedProfile | null;
  enrichment_status: EnrichmentStatus;
  enrichment_step: EnrichmentStep | null;
  consent_basis: ConsentBasis | null;
  consent_at: string | null;
  delete_after: string | null;
  followup_due: string | null;
  followed_up_at: string | null;
  created_at: string;
}

export interface ConnectRequest {
  id: string;
  person_id: string;
  user_id: string;
  note: string | null;
  mode: string;
  status: ConnectStatus;
  queued_at: string;
  sent_at: string | null;
  accepted_at: string | null;
}

export interface NoteTemplate {
  id: string;
  user_id: string;
  name: string | null;
  body: string | null;
  is_default: boolean;
}

export interface UsageEvent {
  id?: number;
  user_id: string | null;
  event: string;
  person_id: string | null;
  meta: Record<string, unknown> | null;
  at: string;
}

// ---- Profile provider shapes ----

export interface ExperienceItem {
  title?: string;
  company?: string;
  location?: string;
  start?: string;
  end?: string;
  description?: string;
}

export interface EducationItem {
  school?: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
}

export interface RecentPost {
  text?: string;
  url?: string;
  date?: string;
}

/** Every field optional. A missing field stays missing: never fill it with a guess. */
export interface NormalizedProfile {
  linkedinUrl?: string;
  name?: string;
  headline?: string;
  about?: string;
  location?: string;
  company?: string;
  role?: string;
  experience?: ExperienceItem[];
  education?: EducationItem[];
  skills?: string[];
  recentPosts?: RecentPost[];
  followers?: number;
  connections?: number;
  photoUrl?: string;
  raw?: unknown;
}

export interface Candidate {
  linkedinUrl: string;
  name?: string;
  headline?: string;
  company?: string;
  location?: string;
  photoUrl?: string;
}

export interface CardFields {
  name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
}

export type PersonWithRequest = Person & { request?: ConnectRequest | null; event_name?: string | null };

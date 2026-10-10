import type { Priority, Purpose, Source, ConsentBasis, ConnectStatus } from "./types";

export const PRIORITY_ORDER: Priority[] = ["priority", "follow_up", "just_met"];

export const LABEL_SETS: Record<Purpose, Record<Priority, string>> = {
  selling: { priority: "Priority", follow_up: "Follow up", just_met: "Just met" },
  hiring: { priority: "Candidate", follow_up: "Interviewed", just_met: "Later" },
  networking: { priority: "Close", follow_up: "Keep warm", just_met: "Just met" },
};

export const priorityLabel = (purpose: Purpose | undefined, p: Priority) =>
  LABEL_SETS[purpose ?? "selling"][p];

export const PURPOSES: { id: Purpose; label: string }[] = [
  { id: "selling", label: "Selling" },
  { id: "hiring", label: "Hiring" },
  { id: "networking", label: "Networking" },
];

export const SOURCE_LABELS: Record<Source, string> = {
  linkedin_qr: "LinkedIn QR",
  card: "Business card",
  digital_card: "Digital card",
  link: "Link",
  manual: "Typed",
  self_submitted: "Shared by them",
};

export const CONSENT_LABELS: Record<ConsentBasis, string> = {
  public_profile: "Public profile",
  card_given: "Card they gave you",
  self_submitted: "Typed by them",
};

export const CONNECT_LABELS: Record<ConnectStatus, string> = {
  queued: "Queued",
  sent: "Sent",
  accepted: "Accepted",
};

export interface SeedTemplate {
  name: string;
  body: string;
  is_default: boolean;
}

export const SEED_TEMPLATES: Record<Purpose, SeedTemplate[]> = {
  selling: [
    {
      name: "After the event",
      body: "Hi {first_name}, great to meet you at {event}. I'd like to stay in touch and hear how things go at {company}.",
      is_default: true,
    },
    { name: "Quick hello", body: "Hi {first_name}, good talking at {event}. Let's connect.", is_default: false },
    { name: "Short and simple", body: "Hi {first_name}, nice meeting you at {event}.", is_default: false },
  ],
  hiring: [
    {
      name: "After the event",
      body: "Hi {first_name}, really enjoyed our chat at {event}. I'd love to keep in touch about what you're working on at {company}.",
      is_default: true,
    },
    { name: "Quick hello", body: "Hi {first_name}, good to meet you at {event}. Let's connect.", is_default: false },
    { name: "Short and simple", body: "Hi {first_name}, nice meeting you at {event}.", is_default: false },
  ],
  networking: [
    {
      name: "After the event",
      body: "Hi {first_name}, great to meet you at {event}. Let's stay in touch.",
      is_default: true,
    },
    { name: "Quick hello", body: "Hi {first_name}, good talking at {event}. Let's connect.", is_default: false },
    { name: "Short and simple", body: "Hi {first_name}, nice meeting you at {event}.", is_default: false },
  ],
};

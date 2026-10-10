import "server-only";
import { realAI } from "../config";
import { askJson, askText, nstr } from "./claude";
import { FIXTURE_CARDS } from "../providers/fixtures";
import { compactProfile, verifyBrief, clampNote, hasValue } from "../grounding";
import type { Brief, CardFields, NormalizedProfile, Starter } from "../types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- Card OCR

const CARD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "title", "company", "email", "phone", "website", "city"],
  properties: { name: nstr, title: nstr, company: nstr, email: nstr, phone: nstr, website: nstr, city: nstr },
};

export async function extractCard(base64: string, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<CardFields> {
  if (!realAI()) {
    await sleep(1200);
    return FIXTURE_CARDS[base64.length % FIXTURE_CARDS.length];
  }
  const out = await askJson<CardFields>(
    "You read business cards. Extract only text that is printed on the card. " +
      "Return null for any field that is not printed on the card. Never infer, complete or guess a value " +
      "(no guessed email formats, no city from a phone prefix, no company from an email domain). " +
      "If the image is not a business card or a screenshot of contact details, return all nulls.",
    [
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
      { type: "text", text: "Extract the contact details printed on this card." },
    ],
    CARD_SCHEMA,
    800,
  );
  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    name: clean(out.name),
    title: clean(out.title),
    company: clean(out.company),
    email: clean(out.email),
    phone: clean(out.phone),
    website: clean(out.website),
    city: clean(out.city),
  };
}

// ---------------------------------------------------------------- Profile brief

const BRIEF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["in_short", "starters"],
  properties: {
    in_short: nstr,
    starters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "source_field"],
        properties: {
          text: { type: "string" },
          source_field: {
            type: "string",
            enum: ["headline", "about", "location", "company", "role", "experience", "education", "skills", "recentPosts"],
          },
        },
      },
    },
  },
};

function fixtureBrief(p: NormalizedProfile): Brief {
  const bits: string[] = [];
  if (p.role && p.company) bits.push(`${p.role} at ${p.company}`);
  else if (p.headline) bits.push(p.headline);
  if (p.location) bits.push(`based in ${p.location}`);
  let inShort = bits.length ? bits.join(", ") + "." : null;
  if (inShort) inShort = inShort[0].toUpperCase() + inShort.slice(1);
  if (inShort && p.experience && p.experience.length > 1 && p.experience[1].company)
    inShort += ` Previously at ${p.experience[1].company}.`;
  const starters: Starter[] = [];
  const post = p.recentPosts?.find((x) => x.text);
  if (post?.text) starters.push({ text: `Ask about their recent post: "${post.text.slice(0, 90)}${post.text.length > 90 ? "…" : ""}"`, source_field: "recentPosts" });
  if (p.experience && p.experience.length > 1 && p.experience[1].company)
    starters.push({ text: `Ask what changed when they moved from ${p.experience[1].company} to ${p.company ?? "their current role"}.`, source_field: "experience" });
  if (p.skills?.length) starters.push({ text: `Ask how ${p.skills[0].toLowerCase()} shows up in their week.`, source_field: "skills" });
  if (p.about) starters.push({ text: `Ask about what they describe as their current focus.`, source_field: "about" });
  return { in_short: inShort, starters };
}

/** Input is the NormalizedProfile only. Output is verified server-side; ungrounded starters are dropped. */
export async function writeBrief(profile: NormalizedProfile): Promise<Brief> {
  const facts = compactProfile(profile);
  const draft = !realAI()
    ? (await sleep(900), fixtureBrief(profile))
    : Object.keys(facts).length <= 1
      ? { in_short: null, starters: [] }
      : await askJson<Brief>(
          "You prepare a short brief about a person someone just met at a trade show, using ONLY the JSON profile given. " +
            "Rules: never add employers, dates, posts, numbers, opinions or facts that are not in the JSON. " +
            "If something is not in the JSON, leave it out. in_short is at most 2 plain sentences, or null if there is too little to say. " +
            "Give up to 3 conversation starters. Each starter's source_field must name the JSON field it is based on. " +
            "Write in plain, warm English. No flattery, no sales language.",
          `Profile JSON:\n${JSON.stringify(facts)}`,
          BRIEF_SCHEMA,
          1200,
        );
  return verifyBrief(draft, profile);
}

// ---------------------------------------------------------------- Voice note summary

export interface VoiceSummary {
  summary: string | null;
  next_steps: string[];
}

const VOICE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "next_steps"],
  properties: { summary: nstr, next_steps: { type: "array", items: { type: "string" } } },
};

function fixtureVoice(t: string): VoiceSummary {
  const sentences = (t.match(/[^.!?]+[.!?]?/g) ?? []).map((s) => s.trim()).filter(Boolean);
  const summary = sentences.slice(0, 2).join(" ") || null;
  const next = sentences
    .filter((s) => /\b(send|call|email|follow|meet|book|share|intro|demo|quote|offer)\b/i.test(s))
    .slice(0, 3)
    .map((s) => s.replace(/[.!?]$/, ""));
  return { summary, next_steps: next };
}

export async function summarizeVoice(transcript: string): Promise<VoiceSummary> {
  const t = transcript.trim();
  if (!t) return { summary: null, next_steps: [] };
  const out = !realAI()
    ? fixtureVoice(t)
    : await askJson<VoiceSummary>(
        "Summarise a voice note someone recorded right after meeting a person at an event. Use only what the transcript says. " +
          "summary: at most 2 sentences. next_steps: up to 3 short actions that the transcript explicitly mentions or clearly implies " +
          "(e.g. 'Send the price list'); empty array if none. Do not invent names, dates, prices or promises. " +
          "The transcript may be German or English; answer in the transcript's language.",
        `Transcript:\n${t}`,
        VOICE_SCHEMA,
        600,
      );
  return { summary: out.summary?.trim() || null, next_steps: (out.next_steps ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 3) };
}

// ---------------------------------------------------------------- Connection note: one grounded line

export async function noteLine(input: {
  profile: NormalizedProfile | null;
  transcript: string | null;
  base: string;
  maxLength: number;
}): Promise<string | null> {
  const room = input.maxLength - input.base.length - 1;
  if (room < 25) return null;
  const facts = input.profile ? compactProfile(input.profile) : {};
  const hasFacts = Object.keys(facts).length > 1 || hasValue(input.transcript);
  if (!hasFacts) return null;
  let line: string | null;
  if (!realAI()) {
    const post = input.profile?.recentPosts?.find((p) => p.text);
    const t = input.transcript?.trim();
    line = post
      ? "Enjoyed your recent post on the topic."
      : t
        ? "Thanks again for the chat."
        : input.profile?.company
          ? `Curious to follow what ${input.profile.company} does next.`
          : null;
  } else {
    const out = await askText(
      `Write ONE short sentence (max ${room} characters) to add to a LinkedIn connection note. ` +
        "Base it only on the profile facts or the user's own voice note below. " +
        "Never claim shared history, meetings, mutual contacts or agreements that are not stated. " +
        "No flattery, no emoji, no sales pitch. Output just the sentence, or the single word NONE if nothing grounded fits.",
      `Note so far: ${input.base}\n\nProfile facts: ${JSON.stringify(facts)}\n\nVoice note: ${input.transcript ?? "(none)"}`,
      200,
    );
    line = /^none\.?$/i.test(out.trim()) ? null : out.trim().replace(/^"|"$/g, "");
  }
  if (!line) return null;
  return clampNote(line, room);
}

// ---------------------------------------------------------------- Follow-up email

export type Tone = "friendly" | "direct" | "short";

export interface EmailDraft {
  subject: string;
  body: string;
}

const EMAIL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "body"],
  properties: { subject: { type: "string" }, body: { type: "string" } },
};

export async function draftEmail(input: {
  firstName: string | null;
  company: string | null;
  eventName: string | null;
  brief: Brief | null;
  transcript: string | null;
  nextSteps: string[] | null;
  senderName: string | null;
  tone: Tone;
}): Promise<EmailDraft> {
  const hi = input.firstName ? `Hi ${input.firstName},` : "Hi,";
  const sign = input.senderName ? `\n\nBest,\n${input.senderName}` : "\n\nBest,";
  if (!realAI()) {
    const at = input.eventName ? ` at ${input.eventName}` : "";
    const step = input.nextSteps?.[0];
    const subject = input.eventName ? `Good to meet you at ${input.eventName}` : "Good to meet you";
    if (input.tone === "short")
      return { subject, body: `${hi}\n\nGood to meet you${at}.${step ? ` As discussed: ${step.toLowerCase()}.` : ""} Happy to keep in touch.${sign}` };
    if (input.tone === "direct")
      return {
        subject,
        body: `${hi}\n\nThanks for your time${at}.${step ? ` Next step from my side: ${step.toLowerCase()}.` : ""} Would a 20-minute call next week work for you?${sign}`,
      };
    return {
      subject,
      body: `${hi}\n\nIt was really good to meet you${at}.${input.company ? ` I enjoyed hearing about what's happening at ${input.company}.` : ""}${step ? `\n\nAs promised: ${step.toLowerCase()}.` : ""}\n\nLet me know if it would help to talk again.${sign}`,
    };
  }
  const toneGuide = {
    friendly: "warm and personal, 4-6 sentences",
    direct: "clear and to the point, propose one concrete next step, 3-4 sentences",
    short: "2-3 sentences",
  }[input.tone];
  const out = await askJson<EmailDraft>(
    "Draft a follow-up email after meeting someone at an event. Use only the facts given. " +
      "Do not promise anything the voice note does not mention, do not mention attachments, prices, dates or meetings that are not stated, " +
      "and never claim shared history beyond meeting at the event. " +
      `Tone: ${toneGuide}. Start with "${hi}". End with a sign-off${input.senderName ? ` from ${input.senderName}` : ""}. ` +
      "Plain text only. Answer in English unless the voice note is in German.",
    JSON.stringify({
      event: input.eventName,
      their_company: input.company,
      brief: input.brief?.in_short ?? null,
      conversation_starters: input.brief?.starters?.map((s) => s.text) ?? [],
      my_voice_note: input.transcript,
      my_next_steps: input.nextSteps ?? [],
    }),
    EMAIL_SCHEMA,
    1200,
  );
  return { subject: out.subject.trim(), body: out.body.trim() };
}

import { fail, json, withRepo } from "@/lib/api";
import { realProfiles } from "@/lib/config";
import { createCapture, runEnrichment } from "@/lib/pipeline";
import { summarizeVoice } from "@/lib/ai";
import { defaultNote } from "@/lib/notes";
import { ensureTemplates } from "@/lib/profile-setup";
import type { ConnectStatus, Priority } from "@/lib/types";

/**
 * Demo only: adds a realistic set of people so every screen has something to show.
 * Uses the same pipeline as real captures (fixture provider + fixture AI), never real Apify.
 */
export const POST = withRepo(async (_req, repo) => {
  if (realProfiles()) return fail("Sample people are only available in demo mode.", 403);
  let profile = await repo.getProfile();
  if (!profile?.current_event_id) {
    const ev = await repo.createEvent({ name: "LogiMAT Stuttgart", event_date: new Date().toISOString().slice(0, 10), followup_delay_days: 1 });
    profile = await repo.updateProfile({ current_event_id: ev.id });
  }
  await ensureTemplates(repo, profile.purpose);

  type Seed = {
    url?: string;
    source: "linkedin_qr" | "link" | "card" | "self_submitted";
    priority: Priority;
    voice?: string;
    connect?: ConnectStatus;
    fields?: Record<string, string>;
  };
  const seeds: Seed[] = [
    {
      url: "https://www.linkedin.com/in/lena-hoffmann-demo",
      source: "linkedin_qr",
      priority: "priority",
      voice: "Talked about their AMR rollout in Ludwigsburg. Send her the Kardex case study by Friday. She wants a call next week with their ops lead.",
      connect: "accepted",
    },
    { url: "https://www.linkedin.com/in/jonas-weber-demo", source: "link", priority: "follow_up", voice: "Early-stage pallet marketplace. Book a demo for their team in November.", connect: "queued" },
    { url: "https://www.linkedin.com/in/amira-schulz-demo", source: "linkedin_qr", priority: "just_met", connect: "sent" },
    { url: "https://www.linkedin.com/in/marco-rossi-demo", source: "link", priority: "just_met", connect: "queued" },
    { url: "https://www.linkedin.com/in/private-demo-profile", source: "linkedin_qr", priority: "just_met" },
    {
      source: "card",
      priority: "follow_up",
      fields: { full_name: "Tobias Krämer", role_title: "Key Account Manager", company: "Fördertechnik Süd AG", email: "t.kraemer@foerdertechnik-sued.example", phone: "+49 711 555 0199", location: "Esslingen" },
      voice: "Interested in conveyor retrofits. Send a quote for two lines.",
    },
    { source: "self_submitted", priority: "just_met", fields: { full_name: "Sofia Brandt", email: "sofia.brandt@example.com" } },
  ];

  const created = await Promise.all(
    seeds.map(async (s) => {
      const person = await createCapture(repo, {
        source: s.source,
        linkedin_url: s.url ?? null,
        consent_basis: s.url ? "public_profile" : s.source === "card" ? "card_given" : "self_submitted",
        enrichment_status: s.url ? "pending" : "ok",
        enrichment_step: s.url ? "qr_read" : "done",
        priority: s.priority,
        ...(s.fields ?? {}),
        first_name: s.fields?.full_name?.split(" ")[0] ?? null,
      });
      if (s.url) await runEnrichment(repo, person.id, s.url);
      if (s.voice) {
        const v = await summarizeVoice(s.voice);
        await repo.updatePerson(person.id, { voice_transcript: s.voice, ai_summary: v.summary, next_steps: v.next_steps });
      }
      if (s.connect) {
        const fresh = (await repo.getPerson(person.id))!;
        const t = new Date().toISOString();
        await repo.upsertRequest(person.id, {
          note: await defaultNote(repo, fresh),
          status: s.connect,
          sent_at: s.connect === "queued" ? null : t,
          accepted_at: s.connect === "accepted" ? t : null,
        });
        if (s.connect !== "queued") await repo.logEvent("request_marked_sent", person.id, { sample: true });
        if (s.connect === "accepted") await repo.logEvent("request_marked_accepted", person.id, { sample: true });
      }
      await repo.logEvent("capture_saved", person.id, { ms_from_start: 9000 + Math.round(Math.random() * 12000), source: s.source, sample: true });
      return person.id;
    }),
  );
  return json({ added: created.length }, 201);
});

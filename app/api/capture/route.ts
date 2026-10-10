import { after } from "next/server";
import { fail, json, readJson, str, withRepo } from "@/lib/api";
import { createCapture, runEnrichment } from "@/lib/pipeline";
import { resolveLinkedIn } from "@/lib/capture-input";
import { normalizeLinkedInUrl } from "@/lib/linkedin";
import { canSearchProfiles } from "@/lib/providers";
import { repoForUser } from "@/lib/session";

export const maxDuration = 300;

/**
 * One entry point for every capture source.
 *  kind=linkedin  { url, via: "qr" | "link" }      -> enrich in the background
 *  kind=card      { fields: CardFields }            -> optional likely-match step
 *  kind=contact   { fields: ContactFields }         -> vCard / MECARD, enrich if it carries a LinkedIn URL
 *  kind=link      { url }                           -> any other URL, saved as a link
 *  kind=manual    { full_name, company? }
 */
export const POST = withRepo(async (req, repo) => {
  const b = await readJson<Record<string, unknown>>(req);
  const enrich = (personId: string, url: string) => {
    const userId = repo.userId;
    after(() => runEnrichment(repoForUser(userId), personId, url));
  };

  switch (b.kind) {
    case "linkedin": {
      const url = await resolveLinkedIn(String(b.url ?? ""));
      if (!url) return fail("That isn't a LinkedIn profile link.");
      const person = await createCapture(repo, {
        source: b.via === "link" ? "link" : "linkedin_qr",
        linkedin_url: url,
        consent_basis: "public_profile",
        enrichment_status: "pending",
        enrichment_step: "qr_read",
      });
      enrich(person.id, url);
      return json({ id: person.id, next: "loading" }, 201);
    }
    case "card": {
      const f = (b.fields ?? {}) as Record<string, unknown>;
      const name = str(f.name, 120);
      const person = await createCapture(repo, {
        source: "card",
        full_name: name,
        role_title: str(f.title, 160),
        company: str(f.company, 160),
        email: str(f.email, 200),
        phone: str(f.phone, 60),
        website: str(f.website, 300),
        location: str(f.city, 120),
        consent_basis: "card_given",
        // Card details are complete on their own; a match (if confirmed) enriches later.
        enrichment_status: "ok",
        enrichment_step: "done",
      });
      return json({ id: person.id, next: name && canSearchProfiles() ? "match" : "review" }, 201);
    }
    case "contact": {
      const f = (b.fields ?? {}) as Record<string, unknown>;
      const li = str(f.linkedin_url, 300);
      const url = li ? normalizeLinkedInUrl(li) : null;
      const person = await createCapture(repo, {
        source: "digital_card",
        full_name: str(f.full_name, 120),
        role_title: str(f.role_title, 160),
        company: str(f.company, 160),
        email: str(f.email, 200),
        phone: str(f.phone, 60),
        website: str(f.website, 300),
        location: str(f.location, 120),
        linkedin_url: url,
        consent_basis: "card_given",
        enrichment_status: url ? "pending" : "ok",
        enrichment_step: url ? "qr_read" : "done",
      });
      if (url) enrich(person.id, url);
      return json({ id: person.id, next: url ? "loading" : "review" }, 201);
    }
    case "link": {
      const raw = str(b.url, 500);
      if (!raw) return fail("Paste a link.");
      const li = await resolveLinkedIn(raw);
      if (li) {
        const person = await createCapture(repo, { source: "link", linkedin_url: li, consent_basis: "public_profile", enrichment_status: "pending", enrichment_step: "qr_read" });
        enrich(person.id, li);
        return json({ id: person.id, next: "loading" }, 201);
      }
      let website: string;
      try {
        website = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).toString();
      } catch {
        return fail("That doesn't look like a link.");
      }
      const person = await createCapture(repo, { source: "link", website, enrichment_status: "ok", enrichment_step: "done" });
      return json({ id: person.id, next: "review" }, 201);
    }
    case "manual": {
      const name = str(b.full_name, 120);
      if (!name) return fail("Type a name.");
      const person = await createCapture(repo, {
        source: "manual",
        full_name: name,
        company: str(b.company, 160),
        enrichment_status: "ok",
        enrichment_step: "done",
      });
      return json({ id: person.id, next: "review" }, 201);
    }
    default:
      return fail("Unknown capture kind");
  }
});

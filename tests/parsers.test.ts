import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeLinkedInUrl, extractLinkedInUrl } from "../lib/linkedin.ts";
import { parseVCard, parseMeCard } from "../lib/vcard.ts";
import { matchReasons } from "../lib/match.ts";

test("normalizes LinkedIn profile URLs", () => {
  assert.equal(normalizeLinkedInUrl("https://de.linkedin.com/in/lena-hoffmann/?utm_source=share"), "https://www.linkedin.com/in/lena-hoffmann");
  assert.equal(normalizeLinkedInUrl("linkedin.com/in/j%C3%BCrgen-m"), "https://www.linkedin.com/in/j%C3%BCrgen-m");
  assert.equal(normalizeLinkedInUrl("https://www.linkedin.com/company/acme"), null);
  assert.equal(normalizeLinkedInUrl("https://evil.com/in/x"), null);
  assert.equal(normalizeLinkedInUrl("https://notlinkedin.com/in/x"), null);
});

test("extracts LinkedIn URL from shared text (Android share target)", () => {
  assert.equal(
    extractLinkedInUrl("Check out Lena Hoffmann's profile on LinkedIn https://www.linkedin.com/in/lena-hoffmann?utm_source=share&utm_medium=member_android"),
    "https://www.linkedin.com/in/lena-hoffmann",
  );
  assert.equal(extractLinkedInUrl("see https://lnkd.in/abc123."), "https://lnkd.in/abc123");
  assert.equal(extractLinkedInUrl("no link here"), null);
});

test("parses vCard 3.0 with folding and LinkedIn URL", () => {
  const v = parseVCard(
    "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Weber;Jonas;;;\r\nFN:Jonas Weber\r\nORG:Palletly;Ops\r\nTITLE:Founder\r\nEMAIL;TYPE=WORK:jonas@palletly.example\r\nTEL;TYPE=CELL:+49 30 1234\r\nADR;TYPE=WORK:;;Torstr. 1;Berlin;;10119;Germany\r\nURL:https://palletly.example\r\nURL:https://www.linkedin.com/in/jonas-weber\r\nNOTE:long\r\n  continued\r\nEND:VCARD",
  );
  assert.equal(v.full_name, "Jonas Weber");
  assert.equal(v.company, "Palletly");
  assert.equal(v.role_title, "Founder");
  assert.equal(v.email, "jonas@palletly.example");
  assert.equal(v.location, "Berlin, Germany");
  assert.equal(v.website, "https://palletly.example");
  assert.equal(v.linkedin_url, "https://www.linkedin.com/in/jonas-weber");
});

test("vCard without FN uses N; missing fields stay null", () => {
  const v = parseVCard("BEGIN:VCARD\nVERSION:2.1\nN:Müller;Anna\nEND:VCARD");
  assert.equal(v.full_name, "Anna Müller");
  assert.equal(v.email, null);
  assert.equal(v.company, null);
});

test("parses MECARD", () => {
  const m = parseMeCard("MECARD:N:Schulz,Amira;TEL:+4991311234;EMAIL:amira@x.example;URL:linkedin.com/in/amira;;");
  assert.equal(m.full_name, "Amira Schulz");
  assert.equal(m.email, "amira@x.example");
  assert.equal(m.linkedin_url, "https://linkedin.com/in/amira");
});

test("strong match needs both name and company", () => {
  const card = { full_name: "Lena Hoffmann", company: "Brandt Logistik GmbH", location: "Stuttgart" };
  assert.equal(matchReasons(card, { linkedinUrl: "x", name: "Lena Hoffmann", company: "Brandt Logistik" }).strong, true);
  assert.equal(matchReasons(card, { linkedinUrl: "x", name: "Lena Hoffmann", location: "Stuttgart, Germany" }).strong, false);
});

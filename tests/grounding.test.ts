import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyBrief, verifyStarters, fillTemplate, clampNote, completeness } from "../lib/grounding.ts";

test("drops starters citing empty or unknown fields", () => {
  const profile = { name: "Lena", headline: "Head of Ops", skills: [], recentPosts: [{ text: "" }] };
  const out = verifyStarters(
    [
      { text: "Ask about ops", source_field: "headline" },
      { text: "Ask about skills", source_field: "skills" },
      { text: "Ask about post", source_field: "recentPosts" },
      { text: "Ask about hobby", source_field: "hobbies" },
      { text: "Ask about name", source_field: "name" },
    ],
    profile,
  );
  assert.deepEqual(out.map((s) => s.source_field), ["headline"]);
});

test("brief for a name-only profile has no summary", () => {
  const b = verifyBrief({ in_short: "Lena is a seasoned leader.", starters: [] }, { name: "Lena" });
  assert.equal(b.in_short, null);
  assert.deepEqual(b.starters, []);
});

test("fillTemplate removes missing placeholders with their preposition", () => {
  assert.equal(
    fillTemplate("Hi {first_name}, great to meet you at {event}. Keen to hear how things go at {company}.", {
      first_name: "Lena",
      event: "LogiMAT",
    }),
    "Hi Lena, great to meet you at LogiMAT. Keen to hear how things go.",
  );
  assert.equal(fillTemplate("Hi {first_name}, nice meeting you.", {}), "Hi, nice meeting you.");
});

test("clampNote respects max length", () => {
  const n = "Hi Lena, great to meet you at LogiMAT. I'd like to stay in touch and hear how things go at Brandt.";
  const c = clampNote(n, 60);
  assert.ok(c.length <= 61, c);
  assert.equal(c, "Hi Lena, great to meet you at LogiMAT.");
});

test("completeness counts filled fields", () => {
  assert.equal(completeness({}), 0);
  assert.ok(completeness({ name: "a", headline: "b" }) > 0);
});

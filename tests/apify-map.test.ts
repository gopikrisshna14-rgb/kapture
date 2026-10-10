import { test } from "node:test";
import assert from "node:assert/strict";
import { mapProfile } from "../lib/providers/apify-map.ts";

test("maps a partial item without inventing fields", () => {
  const p = mapProfile(
    { firstName: "Lena", lastName: "Hoffmann", headline: "Buyer", experience: [{ title: "Buyer", companyName: "Brandt", endDate: "2020" }] },
    "https://www.linkedin.com/in/x",
  );
  assert.equal(p.name, "Lena Hoffmann");
  assert.equal(p.headline, "Buyer");
  // The only experience entry has ended, so current company/role stay empty.
  assert.equal(p.company, undefined);
  assert.equal(p.role, undefined);
  assert.equal(p.about, undefined);
  assert.deepEqual(p.recentPosts, []);
  assert.deepEqual(p.skills, []);
});

test("maps nested location and skill objects", () => {
  const p = mapProfile({ fullName: "A B", location: { default: "Berlin" }, skills: [{ name: "Sourcing" }, "Logistics"] }, "u");
  assert.equal(p.location, "Berlin");
  assert.deepEqual(p.skills, ["Sourcing", "Logistics"]);
});

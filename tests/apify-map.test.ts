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

test("finds fields in nested and unknown shapes", () => {
  const wrapped = mapProfile(
    { data: { person: { fullName: "Julia Neumann", headline: "VP Sales", locationName: "Munich", profilePicHighQuality: "https://x/p.jpg", currentCompanyName: "Kardex", positions: [{ title: "VP Sales", companyName: "Kardex" }] } } },
    "u",
  );
  assert.equal(wrapped.name, "Julia Neumann");
  assert.equal(wrapped.headline, "VP Sales");
  assert.equal(wrapped.location, "Munich");
  assert.equal(wrapped.company, "Kardex");
  assert.equal(wrapped.photoUrl, "https://x/p.jpg");
  assert.equal(wrapped.experience?.length, 1);
});

test("object values become text; job titles never become the headline", () => {
  const p = mapProfile({ first_name: "A", last_name: "B", location: { city: "Berlin", country: "Germany" }, experiences: [{ title: "CEO", company: "X" }] }, "u");
  assert.equal(p.name, "A B");
  assert.equal(p.location, "Berlin, Germany");
  assert.equal(p.headline, undefined);
  assert.equal(p.role, "CEO");
});

test("an error-like item maps to nothing", () => {
  const p = mapProfile({ url: "https://www.linkedin.com/in/x", status: "not_found", message: "Profile not available" }, "u");
  assert.equal(p.name, undefined);
  assert.equal(p.headline, undefined);
});

test("a company's name is never taken as the person's name", () => {
  const p = mapProfile({ firstName: "Lena", lastName: "Hoffmann", currentCompany: { name: "Brandt" } }, "u");
  assert.equal(p.name, "Lena Hoffmann");
  assert.equal(p.company, "Brandt");
  const q = mapProfile({ result: { company: { name: "Brandt" }, headline: "Buyer" } }, "u");
  assert.equal(q.name, undefined);
  assert.equal(q.company, "Brandt");
});

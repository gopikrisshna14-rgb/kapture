import { test } from "node:test";
import assert from "node:assert/strict";
import { searchFairs } from "../lib/event-catalog.ts";

test("finds fairs by name, alias, umlaut-free spelling and city", () => {
  assert.equal(searchFairs("logi")[0].name, "LogiMAT");
  assert.equal(searchFairs("hannover fair")[0].name, "HANNOVER MESSE");
  assert.equal(searchFairs("grune woche")[0].name, "Internationale Grüne Woche");
  assert.ok(searchFairs("dusseldorf", 50).some((f) => f.name === "MEDICA"));
  assert.ok(searchFairs("intralogistics").some((f) => f.name === "LogiMAT"));
  assert.deepEqual(searchFairs("zzzz"), []);
  assert.deepEqual(searchFairs(""), []);
});

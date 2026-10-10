import { test } from "node:test";
import assert from "node:assert/strict";
import { inputFromSchema } from "../lib/providers/apify-input.ts";

const u = "https://www.linkedin.com/in/x";
test("picks the link field from the actor schema", () => {
  assert.deepEqual(inputFromSchema({ properties: [{ key: "profileUrls", type: "array" }], required: [] }, u), { profileUrls: [u] });
  assert.deepEqual(inputFromSchema({ properties: [{ key: "maxItems", type: "integer" }, { key: "urls", type: "array" }], required: [] }, u), { urls: [u] });
  assert.deepEqual(inputFromSchema({ properties: [{ key: "profileUrl", type: "string" }], required: [] }, u), { profileUrl: u });
  assert.deepEqual(inputFromSchema({ properties: [{ key: "startUrls", type: "array", editor: "requestListSources" }], required: [] }, u), { startUrls: [{ url: u }] });
  assert.deepEqual(inputFromSchema({ properties: [{ key: "linkedinProfileLinks", type: "array" }], required: [] }, u), { linkedinProfileLinks: [u] });
});
test("fills other required fields from prefill", () => {
  assert.deepEqual(
    inputFromSchema({ properties: [{ key: "urls", type: "array" }, { key: "proxy", type: "object", prefill: { useApifyProxy: true } }], required: ["urls", "proxy"] }, u),
    { urls: [u], proxy: { useApifyProxy: true } },
  );
});
test("no link field -> null", () => {
  assert.equal(inputFromSchema({ properties: [{ key: "keyword", type: "string" }], required: [] }, u), null);
});

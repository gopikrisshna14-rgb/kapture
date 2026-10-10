import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, toCsv } from "../lib/csv.ts";

test("csv escapes quotes, commas and formula injection", () => {
  assert.equal(csvCell('He said "hi", ok'), '"He said ""hi"", ok"');
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell("+49 711 555"), "'+49 711 555");
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(["a", "b"]), '"a; b"');
  assert.ok(toCsv(["A"], [["Müller"]]).startsWith("﻿A\r\nMüller"));
});

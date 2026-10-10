// Prints an Apify actor's input schema and the keys of one real output item, so the field
// mapping in lib/providers/apify-map.ts can be checked against reality before going live.
//
//   APIFY_TOKEN=... node scripts/apify-inspect.mjs atomus/linkedin-profile-scraper https://www.linkedin.com/in/<someone>
//
// It prints key names and value types only, not values, so no personal data ends up in your terminal log.
const [actor, url, inputTemplate] = process.argv.slice(2);
const token = process.env.APIFY_TOKEN;
if (!actor || !token) {
  console.error("usage: APIFY_TOKEN=... node scripts/apify-inspect.mjs <user/actor> [linkedin-url] ['{\"profileUrls\":[\"{url}\"]}']");
  process.exit(1);
}
const id = actor.replace("/", "~");
const h = { authorization: `Bearer ${token}` };

const act = await (await fetch(`https://api.apify.com/v2/acts/${id}`, { headers: h })).json();
const buildId = act.data?.taggedBuilds?.latest?.buildId;
if (buildId) {
  const build = await (await fetch(`https://api.apify.com/v2/actor-builds/${buildId}`, { headers: h })).json();
  const schema = build.data?.inputSchema ? JSON.parse(build.data.inputSchema) : null;
  console.log("\n== Input schema properties ==");
  for (const [k, v] of Object.entries(schema?.properties ?? {})) console.log(`  ${k}: ${v.type}  ${v.title ?? ""}`);
  console.log("  required:", schema?.required ?? []);
}

if (url) {
  const input = inputTemplate ? JSON.parse(inputTemplate.replaceAll("{url}", url)) : { profileUrls: [url] };
  console.log("\n== Running with input keys:", Object.keys(input).join(", "));
  const r = await fetch(`https://api.apify.com/v2/acts/${id}/run-sync-get-dataset-items?timeout=280`, {
    method: "POST",
    headers: { ...h, "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const items = await r.json();
  const shape = (v, depth = 0) => {
    if (Array.isArray(v)) return v.length ? [shape(v[0], depth + 1)] : [];
    if (v && typeof v === "object" && depth < 3) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x, depth + 1)]));
    return v === null ? "null" : typeof v;
  };
  console.log(`\n== ${Array.isArray(items) ? items.length : 0} item(s); shape of the first ==`);
  console.log(JSON.stringify(shape(Array.isArray(items) ? items[0] : items), null, 2));
}

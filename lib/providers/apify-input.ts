// Pure helpers for building an Apify actor's input from its own input schema (unit-tested).

export interface InputProperty {
  key: string;
  type: string;
  title?: string;
  editor?: string;
  prefill?: unknown;
  default?: unknown;
}
export interface InputSchema {
  title?: string;
  properties: InputProperty[];
  required: string[];
}

const URL_FIELD_ORDER = ["profileUrls", "urls", "profileUrl", "url", "linkedinUrls", "linkedinUrl", "profiles", "profileLinks", "startUrls", "queries"];

/** Picks the input field that takes the LinkedIn link, from the actor's own schema. Pure: unit-tested. */
export function inputFromSchema(schema: InputSchema, url: string): Record<string, unknown> | null {
  const props = schema.properties;
  const byName = (k: string) => props.find((p) => p.key === k);
  const field =
    URL_FIELD_ORDER.map(byName).find(Boolean) ??
    props.find((p) => /(url|link|profile)/i.test(p.key) && (p.type === "array" || p.type === "string"));
  if (!field) return null;
  const value =
    field.type === "string"
      ? url
      : field.editor === "requestListSources" || field.key === "startUrls"
        ? [{ url }]
        : [url];
  const input: Record<string, unknown> = { [field.key]: value };
  // Other required fields: use the actor's own prefill/default so the run starts.
  for (const k of schema.required) {
    if (k === field.key) continue;
    const p = byName(k);
    const v = p?.prefill ?? p?.default;
    if (v !== undefined) input[k] = v;
  }
  return input;
}


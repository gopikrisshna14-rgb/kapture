import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicModel } from "../config";

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 2 }));

type Content = Anthropic.Beta.BetaContentBlockParam[] | string;

async function call(system: string, content: Content, opts: { schema?: Record<string, unknown>; maxTokens?: number }) {
  const res = await anthropic().beta.messages.create({
    model: anthropicModel(),
    max_tokens: opts.maxTokens ?? 2000,
    // Server-side fallback on a safety decline; routes by refusal category.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      ...(opts.schema ? { format: { type: "json_schema" as const, schema: opts.schema } } : {}),
    },
    system,
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal") throw new Error("ai_refused");
  if (res.stop_reason === "max_tokens") throw new Error("ai_truncated");
  return res.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

export async function askJson<T>(system: string, content: Content, schema: Record<string, unknown>, maxTokens?: number): Promise<T> {
  const text = await call(system, content, { schema, maxTokens });
  return JSON.parse(text) as T;
}

export async function askText(system: string, content: Content, maxTokens?: number): Promise<string> {
  return call(system, content, { maxTokens });
}

/** Nullable string in JSON schema form. */
export const nstr = { anyOf: [{ type: "string" }, { type: "null" }] };

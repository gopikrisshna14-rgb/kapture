// Central switchboard: which backends are real and which are demo fixtures.
// Server-only values are read lazily so nothing secret is inlined into client bundles.

const env = (k: string) => (process.env[k] ?? "").trim();

export const isDemoMode = () => env("DEMO_MODE").toLowerCase() !== "false";

/** Supabase is used for auth + data whenever it is configured, independent of DEMO_MODE. */
export const hasSupabase = () =>
  Boolean(env("NEXT_PUBLIC_SUPABASE_URL") && env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));

/** Real Anthropic calls need a key and DEMO_MODE=false. */
export const realAI = () => !isDemoMode() && Boolean(env("ANTHROPIC_API_KEY"));

/** Real Apify calls need a token, a profile actor and DEMO_MODE=false. */
export const realProfiles = () =>
  !isDemoMode() && Boolean(env("APIFY_TOKEN") && env("APIFY_PROFILE_ACTOR"));

export const anthropicModel = () => env("ANTHROPIC_MODEL") || "claude-sonnet-5-5";

export const appUrl = () => env("NEXT_PUBLIC_APP_URL").replace(/\/$/, "") || "http://localhost:3000";

export const adminUserId = () => env("ADMIN_USER_ID");

export const serverSecret = () =>
  env("CRON_SECRET") || env("SUPABASE_SERVICE_ROLE_KEY") || "catch-demo-secret";

export const FREE_CAPTURE_LIMIT = 50;

export function backendSummary() {
  return {
    data: hasSupabase() ? "supabase" : "demo",
    profiles: realProfiles() ? "apify" : "fixtures",
    ai: realAI() ? "anthropic" : "fixtures",
    demoMode: isDemoMode(),
  } as const;
}

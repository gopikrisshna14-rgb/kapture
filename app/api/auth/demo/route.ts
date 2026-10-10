import { cookies } from "next/headers";
import { hasSupabase } from "@/lib/config";
import { fail, json, readJson, str } from "@/lib/api";
import { DEMO_COOKIE } from "@/lib/session";
import { DEMO_USER_ID } from "@/lib/db/demo-store";
import { DemoRepo } from "@/lib/db/demo";
import { uniqueHandle } from "@/lib/profile-setup";

/** Demo sign-in: no email is sent; a cookie marks the session. Disabled when Supabase is configured. */
export async function POST(req: Request) {
  if (hasSupabase()) return fail("Demo sign-in is off when Supabase is configured", 403);
  const body = await readJson(req);
  const email = str(body.email, 200) ?? "you@example.com";
  const repo = new DemoRepo(DEMO_USER_ID);
  const existing = await repo.getProfile();
  if (!existing) {
    await repo.updateProfile({ handle: await uniqueHandle(repo, email.split("@")[0]), email });
  }
  const store = await cookies();
  store.set(DEMO_COOKIE, encodeURIComponent(email), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
    secure: process.env.NODE_ENV === "production",
  });
  const profile = await repo.getProfile();
  return json({ ok: true, onboarded: Boolean(profile?.current_event_id) });
}

import "server-only";
import { cookies } from "next/headers";
import { hasSupabase } from "./config";
import { DEMO_USER_ID, db } from "./db/demo-store";
import { DemoRepo } from "./db/demo";
import { SupabaseRepo } from "./db/supabase";
import type { Repo } from "./db/repo";
import { supabaseAdmin, supabaseServer } from "./supabase/server";
import type { Profile, UsageEvent, Person } from "./types";

export const DEMO_COOKIE = "catch_demo_session";

export interface SessionUser {
  id: string;
  email: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (hasSupabase()) {
    const sb = await supabaseServer();
    const { data } = await sb.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  }
  const store = await cookies();
  const v = store.get(DEMO_COOKIE)?.value;
  if (!v) return null;
  return { id: DEMO_USER_ID, email: decodeURIComponent(v) || null };
}

const adminOrUndefined = () => (process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin() : undefined);

/** Repo for the signed-in user, or null if signed out. */
export async function getRepo(): Promise<Repo | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (hasSupabase()) return new SupabaseRepo(await supabaseServer(), user.id, adminOrUndefined());
  return new DemoRepo(user.id);
}

/** Repo for a known user id outside a request session (background enrichment, public page, cron). */
export function repoForUser(userId: string): Repo {
  if (hasSupabase()) return new SupabaseRepo(supabaseAdmin(), userId);
  return new DemoRepo(userId);
}

export async function findProfileByHandle(handle: string): Promise<Profile | null> {
  if (hasSupabase()) {
    const r = await supabaseAdmin().from("profiles").select("*").eq("handle", handle).maybeSingle();
    return (r.data as Profile | null) ?? null;
  }
  return db().profiles.find((p) => p.handle === handle) ?? null;
}

export async function allUsageEvents(): Promise<UsageEvent[]> {
  if (hasSupabase()) {
    const r = await supabaseAdmin().from("usage_events").select("*").order("at", { ascending: true }).limit(50000);
    return (r.data as UsageEvent[]) ?? [];
  }
  return db().usage_events;
}

export async function expiredPeople(): Promise<Pick<Person, "id" | "user_id">[]> {
  const nowIso = new Date().toISOString();
  if (hasSupabase()) {
    const r = await supabaseAdmin().from("people").select("id,user_id").lt("delete_after", nowIso).limit(1000);
    return (r.data as Pick<Person, "id" | "user_id">[]) ?? [];
  }
  return db().people.filter((p) => p.delete_after && p.delete_after < nowIso).map(({ id, user_id }) => ({ id, user_id }));
}

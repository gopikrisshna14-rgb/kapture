import { cookies } from "next/headers";
import { hasSupabase } from "@/lib/config";
import { json } from "@/lib/api";
import { DEMO_COOKIE } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST() {
  if (hasSupabase()) await (await supabaseServer()).auth.signOut();
  (await cookies()).delete(DEMO_COOKIE);
  return json({ ok: true });
}

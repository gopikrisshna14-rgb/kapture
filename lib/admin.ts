import "server-only";
import { adminUserId, hasSupabase } from "./config";
import { getSessionUser } from "./session";

/** ADMIN_USER_ID when set; in demo data mode (no Supabase) any signed-in demo user. */
export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  const admin = adminUserId();
  return admin ? admin === user.id : !hasSupabase();
}

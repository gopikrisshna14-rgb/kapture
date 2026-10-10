import { requireUser } from "@/lib/server-page";
import { getSessionUser } from "@/lib/session";
import { adminUserId, backendSummary, hasSupabase } from "@/lib/config";
import { DEMO_USER_ID } from "@/lib/db/demo-store";
import { AccountScreen } from "./account-screen";

export default async function AccountPage() {
  const { profile } = await requireUser();
  const user = await getSessionUser();
  const isAdmin = adminUserId() ? adminUserId() === profile.id : !hasSupabase() && profile.id === DEMO_USER_ID;
  return <AccountScreen profile={profile} email={user?.email ?? null} backends={backendSummary()} isAdmin={isAdmin} />;
}

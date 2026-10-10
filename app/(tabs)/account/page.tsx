import { requireUser } from "@/lib/server-page";
import { getSessionUser } from "@/lib/session";
import { adminUserId, backendSummary, hasSupabase } from "@/lib/config";
import { AccountScreen } from "./account-screen";

export default async function AccountPage() {
  const { profile } = await requireUser();
  const user = await getSessionUser();
  const isAdmin = adminUserId() ? adminUserId() === profile.id : !hasSupabase();
  return <AccountScreen profile={profile} email={user?.email ?? null} backends={backendSummary()} isAdmin={isAdmin} />;
}

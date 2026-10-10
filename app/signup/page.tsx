import { hasSupabase } from "@/lib/config";
import { SignUp } from "./signup";
import { demoStoreUnreliable } from "@/lib/db/demo-store";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return <SignUp demo={!hasSupabase()} storeWarning={!hasSupabase() && demoStoreUnreliable()} next={next} error={error} />;
}

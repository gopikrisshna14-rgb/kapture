import { hasSupabase } from "@/lib/config";
import { SignUp } from "./signup";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return <SignUp demo={!hasSupabase()} next={next} error={error} />;
}

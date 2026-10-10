import { Welcome } from "./welcome";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <Welcome next={next} />;
}

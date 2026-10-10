import { requireUser } from "@/lib/server-page";
import { PrivacyScreen } from "./privacy-screen";

export default async function PrivacyPage() {
  const { repo, profile } = await requireUser();
  const people = await repo.listPeople();
  const counts = {
    public_profile: people.filter((p) => p.consent_basis === "public_profile").length,
    card_given: people.filter((p) => p.consent_basis === "card_given").length,
    self_submitted: people.filter((p) => p.consent_basis === "self_submitted").length,
    typed: people.filter((p) => !p.consent_basis).length,
  };
  return (
    <PrivacyScreen
      counts={counts}
      autoDelete={Boolean(profile.auto_delete_months)}
      people={people.map((p) => ({ id: p.id, full_name: p.full_name, company: p.company }))}
    />
  );
}

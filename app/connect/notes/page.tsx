import { requireUser } from "@/lib/server-page";
import { ensureTemplates } from "@/lib/profile-setup";
import { SavedNotes } from "./saved-notes";

export default async function NotesPage() {
  const { repo, profile } = await requireUser();
  const templates = await ensureTemplates(repo, profile.purpose);
  return <SavedNotes initial={templates} aiOn={profile.ai_personalise !== false} maxLength={profile.max_note_length ?? 200} />;
}

import type { Repo } from "./db/repo";
import { SEED_TEMPLATES } from "./labels";
import type { Purpose } from "./types";

export function slugHandle(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "").slice(0, 24) || "me";
}

export async function uniqueHandle(repo: Repo, base: string) {
  const b = slugHandle(base);
  for (let i = 0; i < 50; i++) {
    const h = i === 0 ? b : `${b}${i + 1}`;
    if (!(await repo.isHandleTaken(h))) return h;
  }
  return `${b}${Math.floor(Math.random() * 1e6)}`;
}

/** Seeds the three note templates for a purpose when the user has none yet. */
export async function ensureTemplates(repo: Repo, purpose: Purpose) {
  const existing = await repo.listTemplates();
  if (existing.length) return existing;
  for (const t of SEED_TEMPLATES[purpose]) await repo.createTemplate(t);
  return repo.listTemplates();
}

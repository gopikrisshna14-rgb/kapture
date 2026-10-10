import type { Candidate } from "./types";

const norm = (s?: string | null) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(gmbh|ag|se|kg|ug|ltd|inc|llc|co|& co)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const same = (a?: string | null, b?: string | null) => {
  const x = norm(a);
  const y = norm(b);
  return Boolean(x && y && (x === y || x.includes(y) || y.includes(x)));
};

/** "Strong match" only if both name and company agree. City is a supporting reason, never decisive. */
export function matchReasons(
  card: { full_name: string | null; company: string | null; location: string | null },
  c: Candidate,
) {
  const reasons = {
    name: same(card.full_name, c.name),
    company: same(card.company, c.company) || same(card.company, c.headline),
    city: same(card.location?.split(",")[0], c.location?.split(",")[0]),
  };
  return { reasons, strong: reasons.name && reasons.company };
}

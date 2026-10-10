import { fail, json, withRepo } from "@/lib/api";
import { extractCard } from "@/lib/ai";

export const maxDuration = 60;

const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Card photo or screenshot -> {name,title,company,email,phone,website,city}. The image is not stored. */
export const POST = withRepo(async (req) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return fail("Add a photo of the card.");
  if (file.size > 5_000_000) return fail("That photo is too large (max 5 MB).");
  const type = TYPES.find((t) => t === file.type);
  if (!type) return fail("Use a JPEG, PNG or WebP image.");
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  try {
    const fields = await extractCard(base64, type);
    if (!Object.values(fields).some(Boolean)) return fail("We couldn't read that card. Try again with more light, or type the details.", 422);
    return json(fields);
  } catch {
    return fail("We couldn't read that card. Try again, or type the details.", 502);
  }
});

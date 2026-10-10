import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverSecret } from "./config";

/** Demo accounts: the same email always maps to the same demo user id, so coming back restores your data. */
export function demoUserIdFor(email: string): string {
  const h = createHmac("sha256", serverSecret()).update("demo-user:" + email.trim().toLowerCase()).digest("hex");
  // Format as a v4-shaped UUID so it fits the same columns as real Supabase ids.
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const sign = (uid: string) => createHmac("sha256", serverSecret()).update("demo-cookie:" + uid).digest("base64url");

export const demoCookieValue = (uid: string) => `${uid}.${sign(uid)}`;

export function readDemoCookie(value: string | undefined): string | null {
  if (!value) return null;
  const i = value.lastIndexOf(".");
  if (i < 0) return null;
  const uid = value.slice(0, i);
  const a = Buffer.from(value.slice(i + 1));
  const b = Buffer.from(sign(uid));
  return a.length === b.length && timingSafeEqual(a, b) ? uid : null;
}

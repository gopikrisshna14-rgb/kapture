import "server-only";
import { headers } from "next/headers";
import { appUrl } from "./config";

/** Public origin for links/QRs: the request's own host, falling back to NEXT_PUBLIC_APP_URL. */
export async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return appUrl();
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

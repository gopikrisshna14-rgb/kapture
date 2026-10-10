"use client";

export async function api<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { error?: string }).error || `Request failed (${r.status})`);
  return data as T;
}

/** Fire-and-forget telemetry. Never blocks or breaks the UI. */
export function track(event: string, meta?: Record<string, unknown>, personId?: string) {
  fetch("/api/telemetry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event, meta, person_id: personId }),
    keepalive: true,
  }).catch(() => {});
}

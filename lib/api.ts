import "server-only";
import { NextResponse } from "next/server";
import { getRepo } from "./session";
import type { Repo } from "./db/repo";

export const json = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);

export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Wrap a route handler so it gets the signed-in user's repo, or answers 401. */
export function withRepo<C>(handler: (req: Request, repo: Repo, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    const repo = await getRepo();
    if (!repo) return fail("Not signed in", 401);
    try {
      return await handler(req, repo, ctx);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      if (msg === "not_found") return fail("Not found", 404);
      // No personal data in logs: only the error message.
      console.error("[api]", msg);
      return fail("Something went wrong", 500);
    }
  };
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export const str = (v: unknown, max = 500): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

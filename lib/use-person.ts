"use client";
import { useCallback, useEffect, useState } from "react";
import type { ConnectRequest, Person } from "./types";

export type PersonView = Person & { request: ConnectRequest | null; photo_url: string | null };

/** Loads a person; polls every 1.2 s while enrichment is pending. */
export function usePerson(id: string, poll = true) {
  const [person, setPerson] = useState<PersonView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetch(`/api/people/${id}`, { cache: "no-store" });
    if (!r.ok) {
      setError(r.status === 404 ? "not_found" : "error");
      return null;
    }
    const p = (await r.json()) as PersonView;
    setPerson(p);
    return p;
  }, [id]);
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const run = async () => {
      const p = await load();
      if (alive && poll && p?.enrichment_status === "pending") t = setTimeout(run, 1200);
    };
    run();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [load, poll]);
  return { person, setPerson, error, reload: load };
}

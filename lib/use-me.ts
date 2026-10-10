"use client";
import { useEffect, useState } from "react";
import type { EventRow, Profile } from "./types";

export function useMe() {
  const [me, setMe] = useState<{ profile: Profile; event: EventRow | null } | null>(null);
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => {});
  }, []);
  return me;
}

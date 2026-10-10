import type { Candidate, NormalizedProfile } from "../types";

/** Swappable profile source. The rest of the app never knows which vendor is behind it. */
export interface ProfileProvider {
  readonly name: string;
  getProfile(linkedinUrl: string): Promise<NormalizedProfile>;
  /** Optional: search by card details for the "likely match" step. */
  findProfile?(q: { name: string; company?: string | null; city?: string | null }): Promise<Candidate[]>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly kind: "timeout" | "not_found" | "empty" | "config" | "upstream",
  ) {
    super(message);
  }
}

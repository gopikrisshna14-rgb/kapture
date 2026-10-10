import "server-only";
import { realProfiles } from "../config";
import { ApifyProvider } from "./apify";
import { FixtureProvider } from "./fixture";
import type { ProfileProvider } from "./types";

export function getProfileProvider(): ProfileProvider {
  return realProfiles() ? new ApifyProvider() : new FixtureProvider();
}

/** Whether the card flow should offer a "likely match" step. */
export const canSearchProfiles = () => !realProfiles() || Boolean(process.env.APIFY_SEARCH_ACTOR);

export type { ProfileProvider } from "./types";
export { ProviderError } from "./types";

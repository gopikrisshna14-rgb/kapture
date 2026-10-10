// Maps Apify actor dataset items to NormalizedProfile.
//
// STATUS: UNVERIFIED. api.apify.com and apify.com were unreachable from the build sandbox, so the real
// output keys of atomus/linkedin-profile-scraper (and any posts / search actor) could not be fetched.
// Run `node scripts/apify-inspect.mjs <actor> <linkedin-url>` with APIFY_TOKEN set, compare the printed
// keys with the candidate lists below, and trim each list to the one real key before going live.
// Until then each field tries a short list of candidate keys and never invents a value: a key that is
// not present simply leaves the field empty.
import type { Candidate, EducationItem, ExperienceItem, NormalizedProfile, RecentPost } from "../types";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function pick(o: Obj, keys: string[]): unknown {
  for (const k of keys) {
    const v = k.split(".").reduce<unknown>((acc, part) => (isObj(acc) ? acc[part] : undefined), o);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}
const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : undefined);
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : undefined);
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);

export const PROFILE_KEYS = {
  name: ["fullName", "full_name", "name"],
  firstName: ["firstName", "first_name"],
  lastName: ["lastName", "last_name"],
  headline: ["headline", "title"],
  about: ["summary", "about"],
  location: ["location.default", "location.linkedinText", "location", "addressWithCountry", "geoLocationName"],
  company: ["currentCompany.name", "companyName", "company", "currentPosition.0.companyName"],
  role: ["jobTitle", "currentPosition.0.title", "occupation"],
  experience: ["experience", "experiences", "positions", "workHistory"],
  education: ["education", "educations"],
  skills: ["skills"],
  posts: ["posts", "recentPosts", "activity"],
  followers: ["followers", "followersCount", "followerCount"],
  connections: ["connections", "connectionsCount", "connectionCount"],
  photo: ["profilePicture", "pictureUrl", "profilePic", "photoUrl", "picture", "avatar"],
};

function mapExperience(items: Obj[]): ExperienceItem[] {
  return items
    .map((e) => ({
      title: s(pick(e, ["title", "position", "jobTitle"])),
      company: s(pick(e, ["companyName", "company", "company.name", "subtitle"])),
      location: s(pick(e, ["location", "locationName"])),
      start: s(pick(e, ["startDate.year", "startDate", "start", "starts_at.year", "dateRange.start.year"])),
      end: s(pick(e, ["endDate.year", "endDate", "end", "ends_at.year", "dateRange.end.year"])),
      description: s(pick(e, ["description"])),
    }))
    .filter((e) => e.title || e.company);
}

function mapEducation(items: Obj[]): EducationItem[] {
  return items
    .map((e) => ({
      school: s(pick(e, ["schoolName", "school", "title", "school.name"])),
      degree: s(pick(e, ["degreeName", "degree", "degree_name"])),
      field: s(pick(e, ["fieldOfStudy", "field_of_study", "field"])),
      start: s(pick(e, ["startDate.year", "startDate", "starts_at.year"])),
      end: s(pick(e, ["endDate.year", "endDate", "ends_at.year"])),
    }))
    .filter((e) => e.school);
}

function mapSkills(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : isObj(x) ? s(pick(x, ["name", "title", "skill"])) : undefined))
    .filter((x): x is string => Boolean(x));
}

export function mapPosts(v: unknown): RecentPost[] {
  return arr(v)
    .map((p) => ({
      text: s(pick(p, ["text", "content", "commentary", "postText"])),
      url: s(pick(p, ["url", "postUrl", "link"])),
      date: s(pick(p, ["postedAt.date", "postedAt", "date", "postedDate", "time"])),
    }))
    .filter((p) => p.text)
    .slice(0, 5);
}

function photoUrl(v: unknown): string | undefined {
  if (typeof v === "string" && /^https?:\/\//.test(v)) return v;
  if (isObj(v)) return s(pick(v, ["url", "displayImage", "large", "original"]));
  return undefined;
}

export function mapProfile(item: Obj, linkedinUrl: string): NormalizedProfile {
  const first = s(pick(item, PROFILE_KEYS.firstName));
  const last = s(pick(item, PROFILE_KEYS.lastName));
  const experience = mapExperience(arr(pick(item, PROFILE_KEYS.experience)));
  const profile: NormalizedProfile = {
    linkedinUrl,
    name: s(pick(item, PROFILE_KEYS.name)) ?? ([first, last].filter(Boolean).join(" ") || undefined),
    headline: s(pick(item, PROFILE_KEYS.headline)),
    about: s(pick(item, PROFILE_KEYS.about)),
    location: s(pick(item, PROFILE_KEYS.location)),
    // Current company / role come from explicit fields, or the first experience entry WITHOUT an end date.
    company: s(pick(item, PROFILE_KEYS.company)) ?? experience.find((e) => !e.end)?.company,
    role: s(pick(item, PROFILE_KEYS.role)) ?? experience.find((e) => !e.end)?.title,
    experience,
    education: mapEducation(arr(pick(item, PROFILE_KEYS.education))),
    skills: mapSkills(pick(item, PROFILE_KEYS.skills)),
    recentPosts: mapPosts(pick(item, PROFILE_KEYS.posts)),
    followers: n(pick(item, PROFILE_KEYS.followers)),
    connections: n(pick(item, PROFILE_KEYS.connections)),
    photoUrl: photoUrl(pick(item, PROFILE_KEYS.photo)),
    raw: item,
  };
  return profile;
}

export function mapCandidate(item: Obj): Candidate | null {
  const url = s(pick(item, ["linkedinUrl", "profileUrl", "url", "publicProfileUrl"]));
  if (!url) return null;
  return {
    linkedinUrl: url,
    name: s(pick(item, ["fullName", "name"])),
    headline: s(pick(item, ["headline", "title"])),
    company: s(pick(item, ["currentCompany.name", "companyName", "company"])),
    location: s(pick(item, ["location.default", "location"])),
    photoUrl: photoUrl(pick(item, PROFILE_KEYS.photo)),
  };
}

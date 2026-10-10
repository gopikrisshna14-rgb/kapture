// Maps Apify actor dataset items to NormalizedProfile.
//
// Actors differ in shape, so each field tries: an APIFY_FIELD_MAP override, a list of known paths, then a
// search of the item by key name. It never invents a value: a key that is not present leaves the field empty.
// Check a real actor at /admin/apify.
import type { Candidate, EducationItem, ExperienceItem, NormalizedProfile, RecentPost } from "../types";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function getPath(o: unknown, k: string): unknown {
  return k.split(".").reduce<unknown>((acc, part) => {
    if (Array.isArray(acc) && /^\d+$/.test(part)) return acc[Number(part)];
    return isObj(acc) ? acc[part] : undefined;
  }, o);
}

const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");
const present = (v: unknown) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);

/**
 * Fallback when no known path matches: search the item (up to 4 levels deep, objects only, so a job's
 * "title" inside experience[] is never taken for the headline) for a key with one of these names.
 * Different actors nest the profile differently ({data:{...}}, {basic_info:{...}}, {profile:{...}}).
 */
function deepFind(o: unknown, names: string[], wantArray: boolean, path = "", depth = 0): [unknown, string] | null {
  if (!isObj(o) || depth > 4) return null;
  for (const [k, v] of Object.entries(o)) {
    if (names.includes(norm(k)) && present(v) && Array.isArray(v) === wantArray) return [v, path + k];
  }
  for (const [k, v] of Object.entries(o)) {
    // Never look inside things that have their own "name"/"title" (a company's name isn't the person's).
    if (NO_DESCEND.test(norm(k))) continue;
    if (isObj(v)) {
      const hit = deepFind(v, names, wantArray, `${path}${k}.`, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

const NO_DESCEND = /company|organi[sz]ation|employer|school|education|experience|position|location|geo|post|activit|article|recommend|group|certific|project|language|volunteer|honor|award|course|patent|publication/;

const ARRAY_FIELDS = new Set(["experience", "education", "skills", "posts"]);
export const DEEP_NAMES: Record<string, string[]> = {
  name: ["fullname", "name", "profilename", "displayname"],
  firstName: ["firstname", "givenname"],
  lastName: ["lastname", "familyname", "surname"],
  headline: ["headline", "occupation", "tagline"],
  about: ["about", "summary", "bio"],
  location: ["location", "locationname", "addresswithcountry", "geolocationname", "geolocation"],
  company: ["currentcompany", "companyname", "currentcompanyname", "company", "organization", "employer"],
  role: ["jobtitle", "currentjobtitle", "position", "currentposition", "role"],
  experience: ["experience", "experiences", "positions", "workhistory", "jobs"],
  education: ["education", "educations", "schools"],
  skills: ["skills"],
  posts: ["posts", "recentposts", "activity", "activities"],
  followers: ["followers", "followerscount", "followercount"],
  connections: ["connections", "connectionscount", "connectioncount"],
  photo: ["profilepicture", "profilepic", "profilepicurl", "profilepictureurl", "profilepicturehighquality", "profilepichighquality", "pictureurl", "picture", "photo", "photourl", "avatar", "profileimage", "imageurl"],
};

let currentField: string | null = null;
function pickKey(o: Obj, keys: string[]): [unknown, string | undefined] {
  for (const k of keys) {
    const v = getPath(o, k);
    if (present(v)) return [v, k];
  }
  const field = currentField;
  if (field && DEEP_NAMES[field]) {
    const hit = deepFind(o, DEEP_NAMES[field], ARRAY_FIELDS.has(field));
    if (hit) return hit;
  }
  return [undefined, undefined];
}
const pick = (o: Obj, keys: string[]) => pickKey(o, keys)[0];

/**
 * Optional override from env, once the real keys are known (see /admin/apify), e.g.
 * APIFY_FIELD_MAP={"name":"fullName","company":"experiences.0.companyName"}
 */
export function fieldOverrides(): Partial<Record<keyof typeof PROFILE_KEYS, string>> {
  try {
    const raw = process.env.APIFY_FIELD_MAP;
    return raw ? (JSON.parse(raw) as Partial<Record<keyof typeof PROFILE_KEYS, string>>) : {};
  } catch {
    return {};
  }
}
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : undefined);
/** Text from a string, or from the usual label keys of an object ({name}, {default}, {full}, ...). */
const s = (v: unknown): string | undefined => {
  if (isObj(v)) {
    for (const k of ["name", "default", "full", "linkedinText", "text", "title", "value"]) {
      const t = str(v[k]);
      if (t) return t;
    }
    const parts = ["city", "region", "state", "country"].map((k) => str(v[k])).filter(Boolean);
    return parts.length ? parts.join(", ") : undefined;
  }
  return str(v);
};
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : undefined);
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);

export const PROFILE_KEYS: Record<string, string[]> = {
  name: ["fullName", "full_name", "name", "basic_info.fullname", "basicInfo.fullName"],
  firstName: ["firstName", "first_name", "basic_info.first_name"],
  lastName: ["lastName", "last_name", "basic_info.last_name"],
  headline: ["headline", "basic_info.headline", "title"],
  about: ["summary", "about", "basic_info.about"],
  location: ["location.default", "location.linkedinText", "location.full", "basic_info.location.full", "location", "addressWithCountry", "geoLocationName", "locationName"],
  company: ["currentCompany.name", "companyName", "company", "currentPosition.0.companyName", "basic_info.current_company", "current_company.name"],
  role: ["jobTitle", "currentPosition.0.title", "occupation", "position"],
  experience: ["experience", "experiences", "positions", "workHistory"],
  education: ["education", "educations"],
  skills: ["skills"],
  posts: ["posts", "recentPosts", "activity"],
  followers: ["followers", "followersCount", "followerCount", "basic_info.follower_count"],
  connections: ["connections", "connectionsCount", "connectionCount", "basic_info.connection_count"],
  photo: ["profilePicture", "pictureUrl", "profilePic", "photoUrl", "picture", "avatar", "profile_picture_url", "basic_info.profile_picture_url", "profilePicHighQuality"],
};

function mapExperience(items: Obj[]): ExperienceItem[] {
  currentField = null; // nested entries: known paths only
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
  currentField = null; // nested entries: known paths only
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
  currentField = null; // nested entries: known paths only
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : isObj(x) ? s(pick(x, ["name", "title", "skill"])) : undefined))
    .filter((x): x is string => Boolean(x));
}

export function mapPosts(v: unknown): RecentPost[] {
  currentField = null; // nested entries: known paths only
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
  currentField = null; // nested entries: known paths only
  if (typeof v === "string" && /^https?:\/\//.test(v)) return v;
  if (isObj(v)) return s(pick(v, ["url", "displayImage", "large", "original"]));
  return undefined;
}

/** Keys to try for a field: an env override first, then the built-in candidates. */
function keysFor(field: string): string[] {
  currentField = field;
  const o = (fieldOverrides() as Record<string, string | undefined>)[field];
  return o ? [o, ...PROFILE_KEYS[field]] : PROFILE_KEYS[field];
}

/** Which item key each field was read from (for the /admin/apify check). */
export function mappingReport(item: Obj): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const f of Object.keys(PROFILE_KEYS)) out[f] = pickKey(item, keysFor(f))[1] ?? null;
  currentField = null;
  return out;
}

export function mapProfile(item: Obj, linkedinUrl: string): NormalizedProfile {
  const K = keysFor;
  const first = s(pick(item, K("firstName")));
  const last = s(pick(item, K("lastName")));
  const experience = mapExperience(arr(pick(item, K("experience"))));
  const profile: NormalizedProfile = {
    linkedinUrl,
    name: s(pick(item, K("name"))) ?? ([first, last].filter(Boolean).join(" ") || undefined),
    headline: s(pick(item, K("headline"))),
    about: s(pick(item, K("about"))),
    location: s(pick(item, K("location"))),
    // Current company / role come from explicit fields, or the first experience entry WITHOUT an end date.
    company: s(pick(item, K("company"))) ?? experience.find((e) => !e.end)?.company,
    role: s(pick(item, K("role"))) ?? experience.find((e) => !e.end)?.title,
    experience,
    education: mapEducation(arr(pick(item, K("education")))),
    skills: mapSkills(pick(item, K("skills"))),
    recentPosts: mapPosts(pick(item, K("posts"))),
    followers: n(pick(item, K("followers"))),
    connections: n(pick(item, K("connections"))),
    photoUrl: photoUrl(pick(item, K("photo"))),
    raw: item,
  };
  currentField = null;
  return profile;
}

export function mapCandidate(item: Obj): Candidate | null {
  currentField = null;
  const url = s(pick(item, ["linkedinUrl", "profileUrl", "url", "publicProfileUrl"]));
  if (!url) return null;
  return {
    linkedinUrl: url,
    name: s(pick(item, ["fullName", "name"])),
    headline: s(pick(item, ["headline", "title"])),
    company: s(pick(item, ["currentCompany.name", "companyName", "company"])),
    location: s(pick(item, ["location.default", "location"])),
    photoUrl: photoUrl(pick(item, keysFor("photo"))),
  };
}

import fs from "node:fs";
import path from "node:path";
import type {
  ConnectRequest,
  EventRow,
  NormalizedProfile,
  NoteTemplate,
  Person,
  Profile,
  UsageEvent,
} from "../types";

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

export interface DemoData {
  profiles: Profile[];
  events: EventRow[];
  people: Person[];
  connect_requests: ConnectRequest[];
  note_templates: NoteTemplate[];
  usage_events: UsageEvent[];
  enrichment_cache: { user_id: string; linkedin_url: string; profile: NormalizedProfile; fetched_at: string }[];
  photos: Record<string, { contentType: string; base64: string }>;
}

const empty = (): DemoData => ({
  profiles: [],
  events: [],
  people: [],
  connect_requests: [],
  note_templates: [],
  usage_events: [],
  enrichment_cache: [],
  photos: {},
});

// Vercel's filesystem is read-only except /tmp (and /tmp is per-instance, so demo data there is ephemeral).
const dir = process.env.VERCEL ? "/tmp/catch" : path.join(process.cwd(), ".data");
const file = path.join(dir, "demo-db.json");

const g = globalThis as unknown as { __catchDemo?: DemoData };

export function db(): DemoData {
  if (!g.__catchDemo) {
    try {
      g.__catchDemo = { ...empty(), ...JSON.parse(fs.readFileSync(file, "utf8")) };
    } catch {
      g.__catchDemo = empty();
    }
  }
  return g.__catchDemo!;
}

let pending: NodeJS.Timeout | null = null;
export function persist() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(db()));
    } catch {
      // Demo persistence is best effort.
    }
  }, 50);
}

export function resetDemo() {
  g.__catchDemo = empty();
  persist();
}

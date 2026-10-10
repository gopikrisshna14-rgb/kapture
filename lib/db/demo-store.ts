import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Key-value store behind demo mode. Each table is a hash (field = row id, value = JSON).
 *  - Upstash Redis (REST) when KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN are set.
 *    Required on Vercel: each route can run in a different function with its own memory and /tmp.
 *  - Otherwise a JSON file in .data/ (local dev).
 */
export interface KV {
  hgetall(key: string): Promise<Record<string, string>>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<void>;
  hdel(key: string, ...fields: string[]): Promise<void>;
}

const redisUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const redisToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const hasSharedDemoStore = () => Boolean(redisUrl() && redisToken());
/** True when demo data can't be shared between Vercel functions (sign-in would appear to "forget" you). */
export const demoStoreUnreliable = () => Boolean(process.env.VERCEL) && !hasSharedDemoStore();

class RedisKV implements KV {
  private async cmd<T>(...args: string[]): Promise<T> {
    const r = await fetch(redisUrl(), {
      method: "POST",
      headers: { authorization: `Bearer ${redisToken()}`, "content-type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    const d = (await r.json()) as { result?: T; error?: string };
    if (!r.ok || d.error) throw new Error(`demo store: ${d.error ?? r.status}`);
    return d.result as T;
  }
  async hgetall(key: string) {
    const flat = (await this.cmd<string[]>("HGETALL", key)) ?? [];
    const out: Record<string, string> = {};
    for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
    return out;
  }
  async hget(key: string, field: string) {
    return (await this.cmd<string | null>("HGET", key, field)) ?? null;
  }
  async hset(key: string, field: string, value: string) {
    await this.cmd("HSET", key, field, value);
  }
  async hdel(key: string, ...fields: string[]) {
    if (fields.length) await this.cmd("HDEL", key, ...fields);
  }
}

class FileKV implements KV {
  private dir = process.env.VERCEL ? "/tmp/catch" : path.join(process.cwd(), ".data");
  private file = path.join(this.dir, "demo-kv.json");
  private data: Record<string, Record<string, string>>;
  private timer: NodeJS.Timeout | null = null;
  constructor() {
    try {
      this.data = JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch {
      this.data = {};
    }
  }
  private save() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      try {
        fs.mkdirSync(this.dir, { recursive: true });
        fs.writeFileSync(this.file, JSON.stringify(this.data));
      } catch {}
    }, 50);
  }
  async hgetall(key: string) {
    return { ...(this.data[key] ?? {}) };
  }
  async hget(key: string, field: string) {
    return this.data[key]?.[field] ?? null;
  }
  async hset(key: string, field: string, value: string) {
    (this.data[key] ??= {})[field] = value;
    this.save();
  }
  async hdel(key: string, ...fields: string[]) {
    for (const f of fields) delete this.data[key]?.[f];
    this.save();
  }
}

const g = globalThis as unknown as { __catchKV?: KV };
export const kv = (): KV => (g.__catchKV ??= hasSharedDemoStore() ? new RedisKV() : new FileKV());

const PREFIX = "catch:demo";
export const keys = {
  profiles: `${PREFIX}:profiles`, // uid -> Profile
  handles: `${PREFIX}:handles`, // handle -> uid
  users: `${PREFIX}:users`, // uid -> "1"
  table: (table: string, uid: string) => `${PREFIX}:${table}:${uid}`,
};

export async function rows<T>(key: string): Promise<T[]> {
  return Object.values(await kv().hgetall(key)).map((v) => JSON.parse(v) as T);
}
export async function row<T>(key: string, id: string): Promise<T | null> {
  const v = await kv().hget(key, id);
  return v ? (JSON.parse(v) as T) : null;
}
export async function putRow(key: string, id: string, value: unknown) {
  await kv().hset(key, id, JSON.stringify(value));
}

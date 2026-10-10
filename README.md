# Catch

**Meet people. Stay in touch.**

Catch is a mobile-first web app (installable PWA) for people who meet others at in-person events. You scan a LinkedIn QR code, a business card, a digital card or a link, and the person's profile fills itself in. You add a voice note and a priority, and then you follow up while it's still fresh: a ready-made LinkedIn note (you tap send in LinkedIn yourself) or an email draft.

- Next.js 15 (App Router) + TypeScript + Tailwind 4, deployed to Vercel (`fra1`)
- Supabase (EU / Frankfurt) for auth, Postgres and storage
- Anthropic API for card OCR, profile briefs, voice note summaries, note lines and email drafts
- Apify (actors that need no LinkedIn login or cookies) for public profile data

## Run it locally (demo mode, no keys)

```bash
npm install
cp .env.example .env.local   # DEMO_MODE=true, everything else empty
npm run dev                  # http://localhost:3000
```

Demo mode replaces every external call with realistic fixtures. Data lives in `.data/demo-kv.json`; delete that file to start over. Sign in with any email address (no email is sent); the same address always brings you back to the same demo data, and each address gets its own. **Account → Add sample people** (or the button on the empty People screen) fills every screen with sample data. Then:

- **Scan → LinkedIn QR:** point the camera at any LinkedIn QR code. In demo mode every profile link maps to a sample profile.
- **Paste link** with one of these special demo slugs:
  - `linkedin.com/in/lena-hoffmann-demo` is a rich profile.
  - `linkedin.com/in/jonas-weber-demo` is a thin profile (no about, posts or skills).
  - `linkedin.com/in/marco-rossi-demo` has only a name and a location.
  - `linkedin.com/in/private-anything` fails, so you see the "We couldn't read their profile" screen.
- **Card:** any photo returns a sample card. A card named "Lena Hoffmann" shows the likely-match step.

Other commands:

```bash
npm run build && npm start     # production build (service worker only registers in production)
npm test                       # unit tests: grounding, parsers, CSV, Apify mapping, pilot metrics
npm run typecheck
```

## What's real and what's demo

| Part | Demo mode | With keys |
|---|---|---|
| Auth + data | Cookie session, JSON file store | Supabase magic link / Google, Postgres with RLS |
| Profile data | `FixtureProvider` | `ApifyProvider` (needs `APIFY_TOKEN` + `APIFY_PROFILE_ACTOR`) |
| Card OCR, brief, voice summary, note line, email | Deterministic templates built only from the input | Claude (`ANTHROPIC_MODEL`, default `claude-sonnet-5-5`) |
| QR reading, vCard/MECARD parsing, voice transcript, CSV, clipboard handoff, public page, rate limits, deletion | Real | Real |

Each backend switches independently. Supabase is used whenever its URL and anon key are set, even in demo mode. Apify and Anthropic need `DEMO_MODE=false` and their own keys. Account → the "Demo" card shows which parts are live.

## Create the Supabase project (Frankfurt)

1. Create a project at [supabase.com](https://supabase.com/dashboard) and pick the region **Central EU (Frankfurt) – eu-central-1**. The region can't be changed later.
2. Run the migrations in `supabase/migrations/` in order, either in the SQL editor or with the CLI (`supabase link --project-ref <ref> && supabase db push`). They create:
   - the tables, with row-level security on every table
   - the `photos` storage bucket
   - a trigger that creates a profile row and handle for each new user
   - `delete_expired_people()`
3. Under **Authentication → URL configuration**:
   - set the Site URL to your deployment URL
   - add `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`) to the redirect URLs
4. Google sign-in (optional): under **Authentication → Providers → Google**, add an OAuth client from Google Cloud. Its authorised redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
5. Copy these keys into `.env.local` (and into Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only; it is never sent to the browser)
6. Sign in once, copy your user id from **Authentication → Users** into `ADMIN_USER_ID`, and `/admin/pilot` opens for you.

### Daily auto-delete

`vercel.json` schedules `GET /api/cron/cleanup` daily. Vercel sends `Authorization: Bearer $CRON_SECRET`, so set `CRON_SECRET` in Vercel. The job hard-deletes people whose `delete_after` has passed, along with their stored photo and cached enrichment. If you'd rather run it in the database, the migration also defines `public.delete_expired_people()` for pg_cron. That version can't remove storage objects, so prefer the route.

## Switch from demo mode to real providers

```env
DEMO_MODE=false
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5-5
APIFY_TOKEN=apify_api_...
APIFY_PROFILE_ACTOR=atomus/linkedin-profile-scraper
# optional:
APIFY_PROFILE_INPUT={"profileUrls":["{url}"]}
APIFY_POSTS_ACTOR=
APIFY_SEARCH_ACTOR=
```

**Easiest check: open Account → Apify connection (`/admin/apify`) on the deployed app.** It shows whether the token and actor are accepted, the actor's input fields, and runs one real profile so you can see which fields came back and where from. "Copy as APIFY_FIELD_MAP" gives you an override you can paste into Vercel if a field is read from the wrong key. For lead capture, the basic fields are what matter: name, headline, role, company, location, photo. Leave `APIFY_POSTS_ACTOR` empty unless you want posts.

**Check the Apify field mapping first.** The build sandbox could not reach `api.apify.com` or `apify.com`, so the actor's input key and output field names in `lib/providers/apify-map.ts` are **unverified candidates**. Each field tries a short list of likely keys, and a key that isn't there leaves the field empty; nothing is guessed. To confirm the mapping:

```bash
APIFY_TOKEN=... node scripts/apify-inspect.mjs atomus/linkedin-profile-scraper https://www.linkedin.com/in/<someone-who-agreed>
```

The script prints the actor's input schema and the key names and types of one real output item (not the values). Trim each list in `PROFILE_KEYS` to the real key, and set `APIFY_PROFILE_INPUT` if the input key isn't `profileUrls`.

- If the profile actor returns no posts, set `APIFY_POSTS_ACTOR`.
- The card "likely match" step only runs when `APIFY_SEARCH_ACTOR` is set (in demo mode it always runs).
- Runs use `run-sync-get-dataset-items`, which has a 300 s limit. If an actor regularly takes longer, switch to run + webhook.

Profiles are cached per user for 30 days (`enrichment_cache`), so the same URL isn't paid for twice. The raw actor output is kept in `people.raw_enrichment` for debugging.

## Install the PWA on Android

1. Open the deployed URL in **Chrome on Android**. It must be HTTPS; `localhost` only works over USB port forwarding.
2. Tap ⋮ → **Install app** (or **Add to Home screen**). Catch opens full screen with its own icon.
3. **Share a profile from LinkedIn into Catch:** in the LinkedIn app, open a profile → ⋯ → **Share via…** → **Catch**. Catch opens `/share`, pulls the profile URL out of the shared text and starts the capture pipeline.
   - Catch only shows up in the share sheet after it has been **installed** (WebAPK). It can take a minute after installing.
   - LinkedIn usually sends the link inside `text`, not `url`. `/share` reads all three fields (`url`, `text`, `title`).
   - The share target hasn't been verified on a real Android device yet (see below).
4. **Open LinkedIn** in the connect handoff uses an `intent://` link on Android, so the LinkedIn app opens directly. Without the app it falls back to the browser.

## Deploy to Vercel

### Demo mode on Vercel needs a free Redis store

Vercel runs different routes in different functions, each with its own memory and `/tmp`, so demo data written by one route (sign-in, a capture) is invisible to another. Without shared storage you sign in and land back on the welcome screen. The sign-up screen warns about this.

1. In your Vercel project open **Storage → Create Database → Upstash for Redis** (free plan), pick region **Frankfurt (eu-central-1)**, and **Connect** it to the project.
2. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) automatically.
3. **Deployments → ⋯ → Redeploy.**

Once Supabase is configured, Redis is no longer used.

### Project setup

Import the repo and add the environment variables from `.env.example`. `vercel.json` pins functions to `fra1` (Frankfurt) and adds the cleanup cron. Set `NEXT_PUBLIC_APP_URL` to the production URL; QR codes use the request host when they can.

## Project map

```
app/                     screens (App Router) and API routes (app/api/*)
  (tabs)/                People, Connect, My code, Account (with the tab bar)
  scan/                  camera, QR (BarcodeDetector -> jsQR fallback), card photo, paste, type
  capture/[id]/          loading checklist, likely match, review, can't-read fallback
  c/[handle]/            public "Nice to meet you" page (no login)
  share/                 Android share target
lib/
  db/                    Repo interface + DemoRepo (JSON) + SupabaseRepo
  providers/             ProfileProvider: FixtureProvider, ApifyProvider (+ apify-map)
  ai/                    Claude calls with fixture fallbacks
  grounding.ts           starter verification, template fill, completeness (pure, tested)
  pipeline.ts            source -> normalised input -> enrichment -> people row
supabase/migrations/     schema, RLS, storage bucket, cleanup function
scripts/                 icon generation, Apify inspection
```

## Guardrails, as built

- **No chat and no auto-sending.** Connecting is assisted: copy the note, open the profile, you send, then you mark it sent.
- **No LinkedIn login or cookies.** Profiles come only from cookie-less Apify actors.
- **AI only uses the input it's given.** The brief takes the `NormalizedProfile` only. Each conversation starter must cite a non-empty profile field; the server drops any that don't. Card OCR returns `null` for anything not printed on the card.
- **Every person shows their source:** a source chip plus `consent_basis` (public profile, card given, self-submitted, or typed by you).
- **Hard delete** removes the row, the connect request, the cached enrichment and the stored photo.
- **No personal data in logs.** Routes log error messages only. Telemetry (`usage_events`) holds event names, ids and numbers.
- **Fonts are self-hosted** by `next/font`, so visitors' browsers make no Google Fonts requests.

## Schema additions beyond the brief

- `profiles.current_event_id`: the event new captures go into.
- `profiles.ai_personalise`: the "Personalise with AI" switch on saved notes.
- `people.enrichment_step`: drives the loading checklist (polled every 1.2 s).
- `people.website`: business cards and vCards carry one.
- `enrichment_cache`: the 30-day per-user cache. It's per user so a hard delete never touches another account.
- A unique index on `connect_requests.person_id`: one request per person.

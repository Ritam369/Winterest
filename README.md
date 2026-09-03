# Winterest

> A personal wallpaper library that lives in the cloud — built because my laptop kept running out of storage, and kept being rebuilt because that was the fun part.

**Winterest** (wallpapers + interest, a nod to a certain pinboard site) is a Pinterest-style masonry site for my private wallpaper collection. Images are stored on **Cloudinary**, metadata lives in **MongoDB**, display traffic flows through **ImageKit's CDN**, and the whole thing — React SPA + Express API — runs on a single **Vercel** deployment. There is no public upload UI: I publish wallpapers from my terminal with a one-command CLI.

The real story of this repo isn't the stack, though — it's **how the stack got that way**. Across 35 commits and six distinct iterations (May 29 → Aug 2, 2026), the architecture was torn down and rebuilt three times, each time in response to a real constraint: a platform limit, a free-tier quota, a 25-second cold start, or simply the way I actually used the site. This README documents that journey iteration by iteration, because the iterations *are* the project.

---

## Table of contents

- [Why this exists](#why-this-exists)
- [What it is today](#what-it-is-today)
- [Timeline at a glance](#timeline-at-a-glance)
- [The six iterations](#the-six-iterations)
  - [1 · The big-bang build](#iteration-1--the-big-bang-build)
  - [2 · The deployment gauntlet](#iteration-2--the-deployment-gauntlet)
  - [3 · Making it feel like a real product](#iteration-3--making-it-feel-like-a-real-product)
  - [4 · Search, the command-palette way](#iteration-4--search-the-command-palette-way)
  - [5 · One platform, zero proxied bytes](#iteration-5--one-platform-zero-proxied-bytes)
  - [6 · Scaling the delivery](#iteration-6--scaling-the-delivery)
- [Design decisions: what I tried, what won, what died](#design-decisions-what-i-tried-what-won-what-died)
- [Running it locally](#running-it-locally)
- [Uploading wallpapers (the owner flow)](#uploading-wallpapers-the-owner-flow)
- [Environment variables](#environment-variables)
- [Loose ends I know about](#loose-ends-i-know-about)

---

## Why this exists

My laptop has a storage problem. Wallpapers were the straw: high-resolution 4K images, dozens of them, synced across devices, eating gigabytes. The practical fix was obvious — put them in the cloud. But I'd rather build a small, well-architected site around them than pay for someone else's app. Besides I also had a urge to showcase my wallpapers collections to the other wallpapers-lovers through my own website!

So the requirements were simple:

- **My wallpapers, full quality, from any device** — a masonry grid, a quick download button.
- **Free-tier everything** — MongoDB, Cloudinary, ImageKit, Vercel all on their free plans. Every architectural decision below is shaped by that constraint.
- **No public upload surface** — reads are public, writes are gated behind an API key, and uploads happen from my machine via a CLI.
- **A system-design playground** — every time the site annoyed me, the fix had to be a *design* fix, not a patch.

## What it is today

**Features**

- Masonry grid with incremental column assignment (placed items never move when new batches arrive)
- Paginated feed (20 per batch) that quietly self-completes in the background — scroll to load faster, or don't scroll and it still loads
- ⌘K / Ctrl+K search palette with recent searches, tag suggestions, live previews, and full keyboard navigation
- Server-side tag search over the full database (not just what's loaded)
- Dark mode (persisted, token-based — implemented with zero component changes)
- One-click downloads with proper filenames, via a blob trick around cross-origin limits
- Optimistic click/download counters
- Skeleton loading states, touch-device-safe hover overlays, responsive 2/3/4-column layouts

**Architecture**

```
                                ┌──────────────────────────────────┐
                                │             VERCEL               │
   Visitors ───────────────────►│  client/dist  ·  React SPA       │
                                │  api/index.js ·  Express fn      │
                                └───────┬─────────────────┬────────┘
                                        │                 │
                              ┌─────────▼──────┐   ┌──────▼──────────────┐
                              │    MongoDB     │   │  Cloudinary API     │
                              │   (metadata)   │   │  (sign / destroy)   │
                              └────────────────┘   └─────────────────────┘

  DISPLAY   Browser ──► ImageKit CDN ───cache miss───► Cloudinary (origin)
                     ( ?tr=w-800,q-80,f-auto for cards · q-90,f-auto for modal )

  DOWNLOAD  Browser ──────────────────────────────► Cloudinary (original file)

  UPLOAD    pnpm upload ──1──► GET /api/wallpapers/sign        (x-api-key)
   (me)        │
               ├──2──► POST file directly to Cloudinary
               │        (sharp-compressed locally if > 10 MB first)
               └──3──► POST /api/wallpapers  (metadata → MongoDB)
```

The key idea: **the API never touches image bytes.** Cloudinary is the storage and the origin of record; ImageKit is a pull-CDN (Web Folder origin) that adds on-the-fly transformations the stored URLs never had; MongoDB stores dimensions, tags and counters — which is also what makes the masonry layout math possible before a single image loads.

**Stack**

| Layer | Tech | Role |
|---|---|---|
| Client | React 19, Vite 8, Tailwind CSS v4, Axios | Masonry grid UI |
| API | Express 5 as a Vercel serverless function, Mongoose 9 | Metadata CRUD, upload signing, analytics |
| Database | MongoDB | Wallpaper metadata (dimensions, tags, clicks, downloads) |
| Storage | Cloudinary | Original image files |
| CDN | ImageKit (Cloudinary as origin) | Transformed display delivery |
| Hosting | Vercel | SPA + API on one domain |
| Owner tooling | Node CLI (`scripts/upload.mjs`) + sharp | `pnpm upload` one-command publishing |

## Timeline at a glance

| # | Iteration | When | Driven by | Commits |
|---|---|---|---|---|
| 1 | The big-bang build | May 29, 01:21–01:38 | Feature: get the idea working end-to-end | 3 |
| 2 | The deployment gauntlet | May 29, 01:47–02:58 | Constraint: serverless ≠ long-running Express | 10 |
| 3 | Making it feel like a real product | May 29–31 | UX: downloads, loading, theme, touch | 11 |
| 4 | Search, the command-palette way | Jun 7 | UX + feature: finding wallpapers fast | 1 |
| 5 | One platform, zero proxied bytes | Jul 22 | Constraint: Vercel's 4.5 MB body limit + two-platform fatigue | 6 |
| 6 | Scaling the delivery | Jul 31 – Aug 2 | Usage: a growing collection meets free-tier quotas | 4 |

---

## The six iterations

### Iteration 1 · The big-bang build

**`b72491d` → `b4d085d` · May 29, 01:21–01:38 · driven by: shipping the idea**

The entire monorepo landed in one commit at 1:21 AM: a React 19 + Vite + Tailwind v4 client (masonry grid via CSS columns, modal viewer, optimistic counters), an Express 5 + Mongoose server in a proper layered structure (`controllers / services / routes / models`, `ApiError` / `ApiResponse` utilities, an `x-api-key` middleware on mutating routes from day one), and a `vercel.json` promising a single-platform deploy: static client + Node server on the same domain.

Thirteen minutes later, the first architectural decision was already being revisited. The upload flow used `multer-storage-cloudinary` — and its v4 API only returns `path` and `filename`, which meant every upload needed a **second** Cloudinary API call (`cloudinary.api.resource`) just to learn the image's width and height (needed for the orientation field and later the masonry math). The fix: multer `memoryStorage()` + a promise-wrapped `cloudinary.uploader.upload_stream()` — one upload call, full metadata back, one less dependency. That pattern (buffers in, streams out, never touching disk) survived every later redesign.

> **Takeaway:** wrappers that hide your provider's response shape will cost you a round-trip. Sometimes the boring direct API is the right abstraction level.

### Iteration 2 · The deployment gauntlet

**`3221a19` → `7bd02f4` · May 29, 01:47–02:58 · driven by: serverless ≠ long-running Express**

The original plan — Express app as a Vercel function — met reality. Over the next 111 minutes I tried **five** deployment architectures, each commit a tombstone:

1. **Legacy `builds`/`routes` config** — the old syntax, rejected by modern Vercel projects.
2. **Modern config + explicit `functions` block** — `"runtime": "@vercel/node@5"` declared invalid minutes later (`80ce972`: "remove invalid runtime declaration").
3. **Rewrites into `server/src/index.js`** — no function ever got detected, so `/api/*` fell through to the SPA fallback and returned `index.html` with a 200. The client crashed trying to read `.data` off a string — which produced the next commit: defensive `?? []` guards across `WallpaperModal`, `MasonryGrid` and `useWallpapers`, so the UI survives *any* malformed API response. Those guards are still in the code today.
4. **`api/index.js` re-exporting the app + installing server deps in the build** — plus the canonical serverless Mongo pattern that also survives today: a lazy, cached connection (connect on first request, reuse across warm invocations) instead of connecting at module load.
5. **A fully self-contained 142-line Express function** in `api/` with its own `package.json` — the nuclear option. It worked, at the cost of the server existing twice in the repo.

At 02:55 I cut my losses: the client stayed on Vercel as a pure static deploy, and the API moved to **Render** as a normal long-running Express server. The `api/` folder was deleted. The client's `baseURL` became `import.meta.env.VITE_API_URL ?? '/api'` — absolute URL in production, relative in dev via the Vite proxy, no code changes between environments.

> **Takeaway:** fighting a platform's constraints for two hours is data, not failure. The lazy-Mongo pattern and the hardened client from this night outlived the architecture they were built for. Also: when your API returns HTML with a 200, your client should not white-screen.

### Iteration 3 · Making it feel like a real product

**`c5d313b` → `6a17d92` · May 29–31 · driven by: UX**

With deployment stable, the gap between "works" and "feels good" became the work:

- **Downloads that actually download.** The card's button only fired an analytics counter; the real download lived in the modal. And naive `<a download>` doesn't work cross-origin — browsers ignore the attribute for Cloudinary URLs. Fix: `fetch` → blob → object URL → synthetic click, with a `window.open` fallback, extracted into a shared `downloadWallpaper` hook (DRY after briefly existing as a copy-paste in two components).
- **Honest loading states.** A skeleton grid matching the real layout replaced a lone spinner — plus a banner that told the truth: *"Fetching wallpapers from Render's free tier — this can take 20–25 seconds on a cold start. Hang tight!"*
- **Dark mode with zero component changes.** Because every component already styled through `var(--color-*)` design tokens (Tailwind v4 `@theme`), dark mode was just a `[data-theme="dark"]` block overriding 18 CSS custom properties + a small `useTheme` hook (localStorage + `data-theme` attribute on `<html>`). The token decision from iteration 1 paid off here.
- **The file-size saga** (three commits in 36 minutes, ending 1:32 AM): the upload limit went 20 MB → 10 MB with a friendly error → a *working* friendly error (the first attempt called `next(err)` from inside the error handler, so Express answered with an HTML 500 instead) → then a strategy flip: **stop rejecting, start absorbing.** The limit rose to 50 MB and anything over 10 MB got compressed server-side with sharp (quality 85, stepping down until it fit) before hitting Cloudinary. Robustness moved from the user's problem to the server's job. A `.npmrc` pinning sharp's binary hosts + `npm rebuild sharp` in the build kept the native module installable on Render's Linux builders despite a Windows-generated lockfile.
- **Touch-device hygiene.** Bigger cards, fewer columns (6 → 4). Sticky hover overlays on touch devices fixed with custom Tailwind variants gated behind `@media (hover: hover)` (`group-hoverable`), then a second fix because an `opacity: 0` overlay still *intercepts taps* — `pointer-events-none` until the overlay is actually visible.

> **Takeaway:** "the file is too big, compress it yourself" is the server outsourcing its job to the user. Also: `opacity: 0` is not `display: none` — invisible elements still catch clicks.

### Iteration 4 · Search, the command-palette way

**`e8d6b38` · Jun 7 · driven by: finding wallpapers fast**

The Navbar input became a fake, read-only input that opens a **command palette** (Ctrl+K / Cmd+K from anywhere): recent searches (localStorage, max 8, deduplicated), tag suggestions derived from the union of all tags, a live 6-thumbnail preview while typing, and full keyboard navigation (↑↓ to move, ↵ to select, Esc to close).

The actual search stayed **client-side** at this point — a `useMemo` filter over tags on the already-loaded list. With a small collection, that's instant and costs zero API calls. This was a deliberate "right-size the solution" moment — and iteration 6 shows exactly when that stopped being the right size.

> **Takeaway:** client-side search is a feature. Server-side search is a liability you take on only when the data outgrew the client. Ship the cheap version first.

### Iteration 5 · One platform, zero proxied bytes

**`42b4bae` → `f9b7317` · Jul 22 · driven by: a platform limit + two-platform fatigue**

After six weeks of actually using the site, the two-platform tax (two dashboards, two deploys, cross-origin requests, a sleeping free-tier Render instance with those cold starts) won. One evening, four hours, the whole architecture consolidated back onto Vercel — properly this time:

- **`api/` rose from the grave.** The folder deleted in iteration 2 returned as a 42-line Express app `export default`-ed as a Vercel serverless function — but *reusing* the real `server/src` modules instead of duplicating them (the mistake of attempt #5). Frontend and backend share a domain again, so CORS collapses to same-origin. The lazy-Mongo singleton from iteration 2 finally runs in the environment it was designed for.
- **The 4.5 MB wall.** Vercel serverless functions cap request bodies at 4.5 MB. A wallpaper site that proxies image uploads through its API cannot work here. The fix is the canonical one, and the code comment says it best:

  ```js
  // The browser (or Requestly) calls GET /api/wallpapers/sign to get a signature,
  // then uploads the file directly to Cloudinary (bypassing our server entirely).
  // This sidesteps Vercel's 4.5 MB request body limit.
  ```

  So by generating 𝘀𝗶𝗴𝗻𝗲𝗱 𝗖𝗹𝗼𝘂𝗱𝗶𝗻𝗮𝗿𝘆 𝘂𝗽𝗹𝗼𝗮𝗱 𝘀𝗶𝗴𝗻𝗮𝘁𝘂𝗿𝗲𝘀 on the backend, the client uploads images directly to Cloudinary, completely bypassing the serverless upload limit.  

  **Faster, cleaner, and scalable.**
  

  A new `GET /api/wallpapers/sign` endpoint (API-key gated) signs `{ folder, timestamp }` with the Cloudinary API secret; the uploader POSTs the file straight to Cloudinary with the signature; then POSTs the *metadata* back to the API for MongoDB. The server became a metadata service.

- **Everything that assumed the server sees the file died in one commit.** The multer middleware, the memoryStorage buffer, the 50 MB limit, the MIME whitelist, the server-side sharp compression loop — deleted. With them went an entire category of failure modes. Optimization was outsourced to Cloudinary (`quality: 'auto'`, `fetch_format: 'auto'` on upload).
- **`pnpm upload` — the owner's one-command publisher.** Before this, uploads were a manual dance through an HTTP client (the "Requestly" in that comment). Now: `pnpm upload ./photo.jpg "nature,mountains,dark"` → get signature → upload → save metadata → print the result.
- **sharp's redemption arc, in one day.** Sharp was evicted from the server that morning (native binaries don't belong in a serverless bundle) and rehired that evening as a *root devDependency* — because the CLI compresses locally before uploading: files ≤ 10 MB pass through untouched; anything bigger gets re-encoded (quality 90 → 85 → … floor 75, mozjpeg, PNG → JPEG) until it fits under **Cloudinary's free-tier 10 MB per-file limit**. Same library, correct location: where the bytes already are.

> **Takeaway:** "bypassing our server entirely" is a system design pattern, not a hack. When a platform limit is structural, move the traffic, not the limit. And a private site doesn't need an upload UI — it needs a good CLI.

### Iteration 6 · Scaling the delivery

**`1df8779` → `c96e13a` · Jul 31 – Aug 2 · driven by: a growing collection meets free-tier quotas**

By late July the upload CLI had done its job — the collection had grown, and the delivery model showed it: the API returned **the entire collection in one response**, and every grid thumbnail was a **full-resolution original** (up to 10 MB) straight from Cloudinary, because the stored `secure_url` carried no transformations.

- **Pagination.** `GET /api/wallpapers?page=&limit=` (limit capped at 100) with a parallel `countDocuments()` so the client knows when the feed is exhausted. Search moved server-side at the same time — a case-insensitive `$regex` over the full tags index, because client-side search could now only see "what's loaded so far," which is quietly wrong.
- **Infinite scroll, honestly.** Not an IntersectionObserver: any scroll event fetches the next batch, and a 5-second timer keeps fetching if you don't scroll — the feed **self-completes in the background**. Reloads are instant via a `sessionStorage` cache that's *validated* by comparing the newest `_id` against a page-1 refetch, so new uploads invalidate it automatically.
- **A real masonry algorithm.** CSS multi-columns were replaced by JS shortest-column assignment using the DB-stored aspect ratios — layout math from metadata, no waiting for image loads, and previously placed items never move. Then it was made **incremental**: columns/heights/assigned-ids live in refs, so appending a 20-item batch costs O(20), not O(n) over the whole feed. Then the edge case: switching between feed and search *replaces* the list, so non-incremental changes (any assigned id missing from the incoming list) trigger a full rebuild.

  | Step | Algorithm | Cost per batch |
  |---|---|---|
  | before | CSS `columns-*`, browser reflows | uncontrolled |
  | `1df8779` | JS shortest-column, full recompute (`useMemo`) | O(n) |
  | `e4fe2a0` | incremental — only unassigned items placed | O(delta) |
  | `c96e13a` | + non-incremental detection → full rebuild on list swap/resize | O(delta), O(n) only when needed |

- **ImageKit in front of Cloudinary.** A new 37-line client service rewrites Cloudinary URLs into ImageKit URLs — ImageKit runs as a pull-CDN with Cloudinary configured as its Web Folder origin, so there was **no data migration and the DB stays untouched**. Display URLs get transformations the originals never had (`w-800,q-80,f-auto` for cards — ~2× retina headroom; `q-90,f-auto` for the modal), while downloads deliberately keep hitting the original Cloudinary URL. Free-tier credits: Cloudinary spends them on storage, ImageKit on delivery.
- **State hygiene, same insight twice.** The grid's columns now store only `_id`s (resolved through a live `Map` at render), and the modal stores a `selectedId` instead of a frozen object — so optimistic counter updates are visible everywhere instantly, and stale snapshots became structurally impossible.

> **Takeaway:** pagination isn't just an API concern — it silently invalidated the client-side search design, the masonry algorithm, and the cache strategy. Scale changes ripple. Also: a URL-rewriting CDN gave me image optimization *without migrating anything* — the cheapest architecture change with the biggest payoff in the whole project.

---

## Design decisions: what I tried, what won, what died

| Area | Tried, in order | Landed on | The constraint that decided it |
|---|---|---|---|
| API hosting | Vercel legacy builds → modern config + runtime → rewrite into `server/src` → `api/` re-export → self-contained 142-line function → **Render** → Vercel serverless done right | Express as a Vercel function reusing `server/src` | One platform; solve the body limit by moving uploads, not the API |
| Image upload | multer-storage-cloudinary → multer memory + server→Cloudinary stream → **signed direct upload** | Browser/CLI → Cloudinary directly; API stores metadata only | Wrapper hid metadata; later Vercel's 4.5 MB body limit made proxying impossible |
| File-size governance | reject > 20 MB → reject > 10 MB (friendly error) → accept ≤ 50 MB + server-side sharp → **local sharp in the CLI** | Compress where the bytes already are | Cloudinary's 10 MB free-tier per-file cap; each platform moved the problem until it landed at the edge |
| Search | client-side `useMemo` filter → **server-side `$regex`** | Server-side, full-DB | Pagination made "search what happens to be loaded" quietly wrong |
| Feed delivery | fetch-all-in-one-shot → **paginated + self-completing background load** | 20-item batches, scroll + 5 s timer, sessionStorage cache validated by newest `_id` | One-shot payloads of full-resolution originals |
| Image delivery | raw Cloudinary `secure_url` → **ImageKit pull-CDN transforms** | `w-800,q-80,f-auto` (cards), `q-90,f-auto` (modal); originals for downloads | Free-tier delivery bandwidth + zero-migration optimization |
| Masonry | CSS columns → JS shortest-column (full recompute) → **incremental O(delta) + swap detection** | Refs hold columns/heights/ids; rebuild only on non-incremental change | New batches must never reflow placed items |
| Theme | → **`[data-theme]` CSS token override** | 18 custom properties, zero component changes | Components already styled via `var(--color-*)` tokens |

## Running it locally

Prerequisites: **Node 20+** and **pnpm**.

```bash
# 1. Clone and install (three independent package roots)
pnpm install                    # root — api/ function deps + sharp for the CLI
cd client && pnpm install       # client
cd ../server && pnpm install    # local dev server

# 2. Create a .env at the repo root (see Environment variables)

# 3. Run the API (:3000) and the client (Vite, /api proxied to :3000)
cd .. && pnpm dev
```

The Vite dev server proxies `/api` to `localhost:3000`, so the client's default relative `baseURL` just works locally — no env vars needed for the client.

**Deploying** is a push to `main`: `vercel.json` builds `client/dist` and routes `/api/*` to the serverless function. Set the environment variables in the Vercel project settings (same five as the `.env`).

> Using your own accounts? Besides the env vars, update the ImageKit account slug in `client/src/services/imagekit.js` (`IMAGEKIT_BASE`) and configure an ImageKit Web Folder origin pointing at `https://res.cloudinary.com`.

## Uploading wallpapers (the owner flow)

```bash
pnpm upload ./photo.jpg "nature,mountains,dark"
```

The CLI (`scripts/upload.mjs`) runs the full pipeline:

1. **Sign** — `GET /api/wallpapers/sign` with the `x-api-key` header (only the owner can initiate uploads).
2. **Prepare** — files ≤ 10 MB pass through untouched; larger ones are compressed locally with sharp (quality 90 → 85 → … floor 75, mozjpeg, PNG converted to JPEG) until they fit Cloudinary's free-tier limit.
3. **Upload** — the file goes **directly** to Cloudinary with the signed params. The API never sees the bytes.
4. **Persist** — `POST /api/wallpapers` with the Cloudinary result (`public_id`, `secure_url`, width, height, format) + tags, which lands in MongoDB with derived orientation.

Output: the new wallpaper's ID, URL, tags, and dimensions.

## Environment variables

| Variable | Used by | What it is |
|---|---|---|
| `MONGO_URI` | API | MongoDB connection string |
| `CLOUDINARY_CLOUD_NAME` | API | Cloudinary account name |
| `CLOUDINARY_API_KEY` | API | Cloudinary key (handed back to the uploader via `/sign` — public by design) |
| `CLOUDINARY_API_SECRET` | API | Signs upload params — **never leaves the server** |
| `API_SECRET_KEY` | API, upload CLI | The `x-api-key` value guarding all mutating endpoints |
| `CLIENT_URL` | API *(optional)* | CORS origin override for local dev; defaults to same-origin |
| `UPLOAD_API_BASE` | CLI *(optional)* | API base for `pnpm upload`; defaults to `http://localhost:3000` |

## Loose ends I know about

Honest inventory, kept public on purpose:

- Search results are unpaginated — fine at current scale, will matter eventually.
- The tag `$regex` search is a table scan; a text index or anchored prefix search is the obvious upgrade when the collection demands it.

Every one of these is a small, known trade-off — each was a deliberate "not yet" rather than an oversight.

---

*Built by [Ritam Saha](https://github.com/Ritam369) · The iterations section doubles as the changelog: `git log --reverse` to follow along commit by commit.*

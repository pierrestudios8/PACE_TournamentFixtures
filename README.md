# PACE Tournament Fixture Hub

Static single-page fixture hub for the DAZN / FIFA+ tournament slate.
Everything is inlined in `index.html` — no build step, no dependencies,
no framework. Vercel serves it as-is.

| | |
|---|---|
| Framework preset | **Other** |
| Build command | `node validate.mjs` (set in `vercel.json`) |
| Output directory | repo root (set in `vercel.json`) |
| Install command | *(leave empty)* |

## Files

- `index.html` — the shell: markup, tokens, styles and rendering. Carries a baked-in
  copy of the data as a fallback, so a failed fetch degrades to the last deploy
  rather than an empty page.
- `fixtures.json` — **canonical schedule. Human-approved only.** This is what the
  Figma rollout reads. The results fetcher must never write here.
- `results.json` — display-only scores, keyed by fixture id. Written by the
  scheduled fetcher. Never feeds Figma.
- `validate.mjs` — build gate. Malformed data fails the deploy, not the page.
- `RESULTS-FETCHER.md` — spec for the scheduled updater
- `vercel.json` — no-cache headers so a redeploy is visible immediately, plus
  `X-Robots-Tag: noindex` (see Access, below)
- `robots.txt` — belt and braces on the same

## First deploy

```bash
git init
git add .
git commit -m "PACE fixture hub"
git branch -M main
git remote add origin git@github.com:<owner>/pace-fixture-hub.git
git push -u origin main
```

Then in Vercel: **Add New → Project → Import** the repo, accept the empty
build settings above, Deploy. Every later push to `main` redeploys on its own.

No repo? `npx vercel --prod` from this folder works too, but you re-run it by
hand for every change.

## Access

The fixture data includes kick-off times that aren't public yet, so the
headers above keep it out of search results. That stops crawlers, not people
— **anyone with the URL can open it.** For real access control turn on
Vercel **Deployment Protection** (Project → Settings → Deployment Protection):

- *Vercel Authentication* — only your Vercel team members can open it.
  **Free on every plan, Hobby included**, production deployments too.
- *Password Protection* — one shared password, easiest to give a client.
  **Pro only, $20 per project per month.**

So locking this down costs nothing. You only pay if you want to hand someone
outside the Vercel team a password rather than adding them as a team member.
(Checked against Vercel's pricing docs, 28 Sep 2026.)

## Updating

Three separate things, deliberately:

- **A score** → `results.json`. Written by the scheduled fetcher; nobody pushes by hand.
- **A fixture, kick-off or venue** → `fixtures.json`. Human-approved, because it
  propagates to the Figma assets. Review the diff.
- **Design or behaviour** → `index.html`.

Every fixture carries an IANA time zone, because kick-offs are always set in the time
zone of the event itself. The page shows venue-local time — which is what the
graphics use — and derives UTC only to work out whether a match has been played.

A match past kick-off with no score renders as **awaiting** rather than blank, and the
header carries a "results current as of" stamp with a count of what's outstanding. That
is how a stale feed becomes visible instead of silent.

## Fonts

Archivo Black, Archivo and Roboto load from Google Fonts. If they're ever
blocked, `font-synthesis-weight: none` plus explicit `font-weight: 900` means
the display type falls back genuinely heavy instead of a faked bold.

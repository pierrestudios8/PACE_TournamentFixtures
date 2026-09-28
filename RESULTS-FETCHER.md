# Scheduled results fetcher — spec for sign-off

Not installed yet. It needs the repo to exist first, and you to pick a cadence.

## Why it works this way

No commercial feed covers this slate — football-data.org carries none of the five
competitions, and the feeds that do are enterprise licences. But the results *are*
publicly reported. So the fetcher is a scheduled session that searches for them,
which is what you suggested.

The reason that's safe here is the split you drew: **results never touch the assets.**
The fetcher can only write `results.json`, which drives the hub's display. It is
forbidden from touching `fixtures.json`, which is what the Figma rollout reads. A
bot mistake shows a wrong score on a web page for a few hours. It cannot put a wrong
kick-off time into a broadcast graphic.

## The rules it runs under

1. **Read `fixtures.json`.** Find every match whose kick-off is more than 150 minutes
   past — computed from the venue-local time and its IANA zone — and that has no
   result, or one with `confirmed: false`.
2. **Search for each.** Prefer the competition's own site, then a national
   federation or a recognised outlet.
3. **Write only with a citable source.** Every result records the URL it came from.
   No source, no write.
4. **Two sources, or flag it.** If only one source is found, or two disagree, leave
   the score out and list the match in the run report instead. An empty cell reading
   *awaiting* is a visible gap; a wrong score is an invisible one.
5. **Never overwrite `confirmed: true`.** Anything you or the team entered by hand
   outranks anything the fetcher finds.
6. **Never write `fixtures.json`.** If a kick-off or venue looks to have changed, it
   says so in the report and stops. That change goes through you, because it
   propagates to Figma.
7. **Commit, push, report.** Vercel redeploys, and `validate.mjs` blocks the deploy
   if the write was malformed. The report says what changed, what was skipped and why.

## What a run costs you

Most runs find nothing and say so. On a matchday it's one message listing the scores
it added with their sources, plus anything it refused to guess at. Every change is a
git diff, so a wrong score is traceable to the run and the source that caused it, and
revertible.

## Cadence to pick

Your matches cluster awkwardly across zones — NZ National League fixtures finish
around 04:00 SAST, European and African tournaments in the evening.

- **Twice daily, 07:00 and 19:00 SAST** — recommended. Catches NZ overnight results
  before your morning, and European/African results the same evening.
- **Daily at 07:00 SAST** — fine if same-day scores aren't urgent.
- **Matchday-aware** — heavier setup, and the schedule is already known, so the
  fixed cadence gets you the same thing for less.

## Still open

- `fixtures.json` currently records 16 results as `confirmed: true` with
  `source: null` — those were entered by hand before provenance existed. They're
  protected from being overwritten, but they have no citation behind them.
- The U-20 third-place play-off and final were played on 26–27 September and have no
  score recorded. The hub is flagging both right now.

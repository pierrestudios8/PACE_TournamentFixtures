#!/usr/bin/env node
/* Build gate. A malformed edit should fail the deploy, not the page.
   Vercel runs this as the build command; a non-zero exit blocks the deploy. */
import fs from 'fs';

const problems = [];
const warnings = [];
const fail = m => problems.push(m);
const warn = m => warnings.push(m);

let F, R;
try { F = JSON.parse(fs.readFileSync('fixtures.json', 'utf8')); }
catch (e) { console.error('fixtures.json is not valid JSON:', e.message); process.exit(1); }
try { R = JSON.parse(fs.readFileSync('results.json', 'utf8')); }
catch (e) { console.error('results.json is not valid JSON:', e.message); process.exit(1); }

/* ---- fixtures.json ---- */
if (!Array.isArray(F.tournaments)) fail('fixtures.tournaments must be an array');
if (!F.fixtures || typeof F.fixtures !== 'object') fail('fixtures.fixtures must be an object');

const tids = new Set((F.tournaments || []).map(t => t.id));
for (const t of F.tournaments || []) {
  for (const k of ['id', 'name', 'short', 'start', 'end']) {
    if (!t[k]) fail(`tournament ${t.id || '?'} is missing "${k}"`);
  }
  if (t.start && t.end && t.end < t.start) fail(`tournament ${t.id}: end ${t.end} precedes start ${t.start}`);
}

const ids = new Set();
const seen = new Set();
let matches = 0, byes = 0, noTz = 0;

for (const [tid, list] of Object.entries(F.fixtures || {})) {
  if (!tids.has(tid)) fail(`fixtures."${tid}" has no matching tournament entry`);
  if (!Array.isArray(list)) { fail(`fixtures."${tid}" must be an array`); continue; }

  for (const [i, f] of list.entries()) {
    const at = `${tid}[${i}]`;
    if (f.bye) { byes++; if (f.round == null) fail(`${at}: bye with no round`); continue; }
    matches++;

    if (!f.id) { fail(`${at}: missing id`); continue; }
    if (ids.has(f.id)) fail(`duplicate fixture id "${f.id}"`);
    ids.add(f.id);
    if (!f.id.startsWith(tid + '-')) fail(`${at}: id "${f.id}" does not belong to "${tid}"`);

    for (const k of ['home', 'away']) if (!f[k]) fail(`${f.id}: missing "${k}"`);

    // A date may legitimately be absent (ASEAN's grid is unpublished), but if present it must parse.
    if (f.date != null) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) fail(`${f.id}: date "${f.date}" is not YYYY-MM-DD`);
      else if (isNaN(new Date(f.date + 'T00:00:00Z'))) fail(`${f.id}: date "${f.date}" is not a real date`);
    }
    if (f.ko != null && !/^\d{2}:\d{2}$/.test(f.ko)) fail(`${f.id}: ko "${f.ko}" is not HH:MM`);

    // Timezone: fixtures are set in the time zone of the event itself, so a dated
    // fixture without one cannot be placed on a clock.
    if (f.tz == null) {
      noTz++;
      if (f.date && f.ko) fail(`${f.id}: has a date and kick-off but no tz — local time is ambiguous`);
      else warn(`${f.id}: no tz (venue still TBC)`);
    } else {
      try { new Intl.DateTimeFormat('en-US', { timeZone: f.tz }); }
      catch { fail(`${f.id}: "${f.tz}" is not a valid IANA time zone`); }
    }

    const key = `${tid}|${f.date}|${f.ko}|${f.home}|${f.away}`;
    if (f.date && seen.has(key)) warn(`${f.id}: looks like a duplicate of an earlier fixture`);
    seen.add(key);
  }
}

/* ---- results.json ---- */
if (!R.results || typeof R.results !== 'object') fail('results.results must be an object');
if (!R.updated) fail('results.updated is missing — the page shows it as the freshness stamp');
else if (isNaN(new Date(R.updated))) fail(`results.updated "${R.updated}" is not a valid timestamp`);

let confirmed = 0, sourced = 0;
for (const [id, r] of Object.entries(R.results || {})) {
  if (!ids.has(id)) fail(`result "${id}" does not match any fixture`);
  if (!r.score) fail(`result "${id}": missing score`);
  else if (!/^\d+[–-]\d+$/.test(r.score)) fail(`result "${id}": score "${r.score}" is not N–N`);
  if (r.pens && !/^\d+[–-]\d+$/.test(r.pens)) fail(`result "${id}": pens "${r.pens}" is not N–N`);
  if (r.confirmed) confirmed++;
  if (r.source) sourced++;
  else if (!r.confirmed) warn(`result "${id}": no source and not human-confirmed`);
}

/* ---- report ---- */
console.log(`fixtures  ${matches} matches, ${byes} byes, ${F.tournaments?.length ?? 0} tournaments`);
console.log(`results   ${Object.keys(R.results || {}).length} recorded, ${confirmed} human-confirmed, ${sourced} with a source`);
if (noTz) console.log(`timezone  ${noTz} fixture(s) without a zone (venue TBC)`);

for (const w of warnings) console.log(`  warn  ${w}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s) — deploy blocked:`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log('\nok — data is well formed');

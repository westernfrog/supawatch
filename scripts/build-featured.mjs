#!/usr/bin/env node
/**
 * build-featured.mjs
 *
 * Curates a hand-picked "Featured" playlist of well-known, high-quality
 * channels out of the large category playlists under public/playlists.
 *
 * For every curated entry it scans all source playlists, finds matching
 * channels by their cleaned name, and keeps the single best stream
 * (prefers non-geo-blocked, 24/7, highest resolution). The result is
 * written to:
 *   - public/playlists/featured.m3u   (grouped, ready for the /live page)
 *   - CURATED_CHANNELS.md             (human-readable review list)
 *
 * Usage (from the supawatch project root):
 *   node scripts/build-featured.mjs
 */

import fs from "fs/promises";
import path from "path";

// Source playlists live outside the served folder so /live only ships the
// curated featured.m3u. The curated output is written back into public/playlists.
const srcDir = path.join(process.cwd(), "playlist-sources");
const outDir = path.join(process.cwd(), "public", "playlists");

/* The curation. Each line is [category, displayName, matchName?].
 * matchName (lower-case, tags stripped) defaults to displayName. */
const CURATED = [
  // ── News · World ──────────────────────────────────────────────
  ["News · World", "Al Jazeera English"],
  ["News · World", "BBC News", "bbc news asia pacific"],
  ["News · World", "France 24 English"],
  ["News · World", "TRT World"],
  ["News · World", "CGTN"],
  ["News · World", "CNA"],
  ["News · World", "WION"],
  ["News · World", "GB News"],
  ["News · World", "NHK World-Japan"],
  ["News · World", "Africanews"],
  ["News · World", "Reuters"],
  ["News · World", "Sky News", "sky news extra 1"],

  // ── News · USA ────────────────────────────────────────────────
  ["News · USA", "CBS News 24/7"],
  ["News · USA", "NBC News NOW"],
  ["News · USA", "LiveNOW from FOX"],
  ["News · USA", "ABC News"],
  ["News · USA", "Newsmax TV"],
  ["News · USA", "Scripps News"],
  ["News · USA", "USA Today News"],
  ["News · USA", "The Young Turks"],
  ["News · USA", "Global News"],

  // ── News · India ──────────────────────────────────────────────
  ["News · India", "NDTV 24X7"],
  ["News · India", "NDTV India"],
  ["News · India", "Aaj Tak"],
  ["News · India", "ABP News"],
  ["News · India", "Zee News"],
  ["News · India", "DD News"],
  ["News · India", "India Today"],
  ["News · India", "Republic Bharat"],
  ["News · India", "Times Now Navbharat"],
  ["News · India", "TV9 Bharatvarsh"],
  ["News · India", "Good News Today"],
  ["News · India", "Bharat24"],
  ["News · India", "IBC 24"],

  // ── Entertainment ─────────────────────────────────────────────
  ["Entertainment", "Comet"],
  ["Entertainment", "Game Show Network East"],
  ["Entertainment", "The Price is Right"],
  ["Entertainment", "Wipeout"],
  ["Entertainment", "People Are Awesome"],
  ["Entertainment", "Top Gear"],
  ["Entertainment", "MY5"],
  ["Entertainment", "Star Channel"],
  ["Entertainment", "BET Pluto TV"],
  ["Entertainment", "MTV Pluto TV"],
  ["Entertainment", "Pluto TV Reality"],
  ["Entertainment", "Pluto TV British TV"],
  ["Entertainment", "Pluto TV Anime"],
  ["Entertainment", "Hi-YAH!"],
  ["Entertainment", "Shemaroo TV"],

  // ── Movies ────────────────────────────────────────────────────
  ["Movies", "Pluto TV Movies"],
  ["Movies", "Pluto TV Action"],
  ["Movies", "Pluto TV Horror"],
  ["Movies", "Pluto TV Sci-Fi"],
  ["Movies", "Pluto TV Thrillers"],
  ["Movies", "Pluto TV Western"],
  ["Movies", "Pluto TV Drama"],
  ["Movies", "Pluto TV Romance"],
  ["Movies", "Paramount Movie Channel"],
  ["Movies", "Paramount+ Picks"],
  ["Movies", "Classic Movies Channel"],
  ["Movies", "GREAT! movies"],
  ["Movies", "Rakuten Top Movies UK"],
  ["Movies", "Rakuten TV Action Movies UK"],
  ["Movies", "Rakuten TV Comedy Movies UK"],
  ["Movies", "Rakuten TV Drama Movies UK"],
  ["Movies", "Rakuten TV Family Movies UK"],
  ["Movies", "MBC Bollywood"],
  ["Movies", "Cine Sony"],
  ["Movies", "80s Rewind"],
  ["Movies", "90s Throwback"],
  ["Movies", "Pluto TV Crime Drama"],
  ["Movies", "Charge!"],

  // ── Series ────────────────────────────────────────────────────
  ["Series", "Pluto TV Star Trek"],
  ["Series", "Star Trek"],
  ["Series", "Pluto TV Sherlock"],
  ["Series", "The Walking Dead Universe"],
  ["Series", "Comedy Central South Park"],
  ["Series", "Pluto TV True Crime"],
  ["Series", "The Amazing Race"],
  ["Series", "Survivor"],
  ["Series", "Baywatch"],
  ["Series", "Cheers"],
  ["Series", "Frasier"],
  ["Series", "The Addams Family"],
  ["Series", "Three's Company"],
  ["Series", "Walker Texas Ranger"],
  ["Series", "Mythbusters"],
  ["Series", "48 Hours"],
  ["Series", "The Bob Ross Channel"],
  ["Series", "This Old House"],
  ["Series", "PBS Nature"],
  ["Series", "Antiques Road Show UK"],
  ["Series", "Gunsmoke"],
  ["Series", "Perry Mason"],
  ["Series", "Cops"],
  ["Series", "Bar Rescue"],

  // ── Comedy ────────────────────────────────────────────────────
  ["Comedy", "Comedy Central Pluto TV"],
  ["Comedy", "Just for Laughs Gags"],
  ["Comedy", "FailArmy"],
  ["Comedy", "Pluto TV Stand Up"],
  ["Comedy", "Mystery Science Theater 3000"],
  ["Comedy", "AFV"],
  ["Comedy", "Tosh.0"],
  ["Comedy", "Wild 'N Out"],
  ["Comedy", "Comedy Central"],
  ["Comedy", "TV Land Sitcoms"],

  // ── Kids ──────────────────────────────────────────────────────
  ["Kids", "Nickelodeon"],
  ["Kids", "NickToons"],
  ["Kids", "Nick Jr. Pluto TV"],
  ["Kids", "PBS Kids"],
  ["Kids", "ABC Kids"],
  ["Kids", "Toon Goggles"],
  ["Kids", "Tom And Jerry"],
  ["Kids", "Baby Shark TV"],
  ["Kids", "LEGO Kids TV"],
  ["Kids", "Pluto TV Kids"],
  ["Kids", "Garfield and Friends"],
  ["Kids", "Beyblade Burst"],
  ["Kids", "Super Simple Songs"],
  ["Kids", "Pocket.watch"],
  ["Kids", "Cartoon Classics"],
  ["Kids", "Ninja Kidz TV"],
  ["Kids", "Tiny Pop"],

  // ── Documentary ───────────────────────────────────────────────
  ["Documentary", "BBC Earth"],
  ["Documentary", "CGTN Documentary"],
  ["Documentary", "Pluto TV Documentaries"],
  ["Documentary", "Pluto TV History"],
  ["Documentary", "Pluto TV Crime"],
  ["Documentary", "Forensic Files"],
  ["Documentary", "FBI Files"],
  ["Documentary", "Court TV"],
  ["Documentary", "Law & Crime"],
  ["Documentary", "Voyager Documentaries"],
  ["Documentary", "Crime 360"],
  ["Documentary", "Dateline 24/7"],
  ["Documentary", "Asharq Discovery"],
  ["Documentary", "Pluto TV Mystery"],
  ["Documentary", "Pluto TV Paranormal"],
  ["Documentary", "Ink Master"],

  // ── Sports ────────────────────────────────────────────────────
  ["Sports", "Red Bull TV"],
  ["Sports", "NBA TV"],
  ["Sports", "NFL Channel"],
  ["Sports", "Tennis Channel"],
  ["Sports", "PGA Tour"],
  ["Sports", "beIN SPORTS XTRA"],
  ["Sports", "talkSPORT"],
  ["Sports", "Real Madrid TV"],
  ["Sports", "FUEL TV"],
  ["Sports", "Stadium"],
  ["Sports", "CBS Sports HQ"],
  ["Sports", "CBS Sports Golazo Network"],
  ["Sports", "SportsGrid"],
  ["Sports", "World Poker Tour"],
  ["Sports", "Adventure Sports TV"],
  ["Sports", "GLORY Kickboxing"],
  ["Sports", "Bellator MMA"],
  ["Sports", "NHL"],
  ["Sports", "PokerGo"],

  // ── Music ─────────────────────────────────────────────────────
  ["Music", "MTV Music"],
  ["Music", "MTV Classic"],
  ["Music", "MTV Unplugged"],
  ["Music", "Yo! MTV"],
  ["Music", "VH1 Hip Hop Family"],
  ["Music", "Vevo Pop"],
  ["Music", "Vevo '80s"],
  ["Music", "Vevo '90s"],
  ["Music", "Vevo R&B"],
  ["Music", "Vevo Country"],
  ["Music", "Stingray Greatest Hits"],
  ["Music", "Stingray Classic Rock"],
  ["Music", "Stingray Hot Country"],
  ["Music", "Stingray Smooth Jazz"],
  ["Music", "Clubbing TV"],
  ["Music", "Qello Concerts by Stingray"],
  ["Music", "XITE"],
  ["Music", "Tarang Music"],
  ["Music", "9X Tashan"],
  ["Music", "PTC Music"],
  ["Music", "Music India"],
  ["Music", "Vevo Latino"],
  ["Music", "MTV Biggest Pop"],

  // ── Food & Lifestyle ──────────────────────────────────────────
  ["Food & Lifestyle", "America's Test Kitchen"],
  ["Food & Lifestyle", "bon appétit"],
  ["Food & Lifestyle", "BBC Food"],
  ["Food & Lifestyle", "Tastemade"],
  ["Food & Lifestyle", "Gordon Ramsay's Hell's Kitchen"],
  ["Food & Lifestyle", "Gusto TV"],
  ["Food & Lifestyle", "Julia Child"],
  ["Food & Lifestyle", "The Jamie Oliver Channel"],
  ["Food & Lifestyle", "BBC Travel"],
  ["Food & Lifestyle", "BBC Home & Garden"],
  ["Food & Lifestyle", "NDTV Good Times"],
  ["Food & Lifestyle", "The Design Network"],

  // ── Nature & Pets ─────────────────────────────────────────────
  ["Nature & Pets", "Love Nature"],
  ["Nature & Pets", "Pluto TV Nature"],
  ["Nature & Pets", "Waypoint TV"],
  ["Nature & Pets", "AKC TV"],
  ["Nature & Pets", "Pursuit UP"],
  ["Nature & Pets", "The Pet Collective"],
  ["Nature & Pets", "AKC TV Puppies 24/7"],
];

/* Strip "(1080p)", "[Geo-blocked]", "[Not 24/7]" etc. for name comparison. */
function cleanName(name) {
  return name
    .replace(/\s*\([0-9]+[pi]\)/gi, "")
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s*Ⓨ/g, "") // YouTube-source marker used in playlist_india
    .trim();
}

function parseM3U(content) {
  const lines = content.split("\n").map((l) => l.replace(/\r$/, ""));
  const entries = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("#EXTINF")) {
      const nameMatch = t.match(/,(.+)$/);
      cur = { meta: line, raw: t, name: nameMatch ? nameMatch[1].trim() : "", url: null };
    } else if (cur && cur.url === null && t && !t.startsWith("#")) {
      cur.url = t;
      entries.push(cur);
      cur = null;
    }
  }
  return entries;
}

/* Higher score = better stream. */
function scoreEntry(e) {
  let s = 0;
  const raw = e.raw;
  if (/\[geo-blocked\]/i.test(raw)) s -= 100;
  if (/\[not 24\/7\]/i.test(raw)) s -= 40;
  const res = raw.match(/\((\d+)[pi]\)/);
  if (res) s += Math.min(Number(res[1]), 1080) / 100; // prefer higher res
  if (e.url.startsWith("https://")) s += 1;
  return s;
}

async function main() {
  // iptv-org genre sources only — exclude the curated output and the
  // geo-locked Pluto dump (global.m3u must be work-anywhere streams).
  const files = (await fs.readdir(srcDir)).filter(
    (f) => /\.m3u8?$/i.test(f) && f !== "featured.m3u" && f !== "plutotv_all.m3u",
  );
  const all = [];
  for (const f of files) {
    const content = await fs.readFile(path.join(srcDir, f), "utf8");
    for (const e of parseM3U(content)) {
      e.clean = cleanName(e.name);
      e.source = f;
      all.push(e);
    }
  }

  const picked = [];
  const missing = [];
  const seenUrls = new Set();

  for (const [category, display, match] of CURATED) {
    const target = (match || display).toLowerCase();
    const candidates = all.filter((e) => e.clean.toLowerCase() === target);
    if (candidates.length === 0) {
      missing.push(display);
      continue;
    }
    candidates.sort((a, b) => scoreEntry(b) - scoreEntry(a));
    const best = candidates.find((c) => !seenUrls.has(c.url)) || candidates[0];
    seenUrls.add(best.url);
    picked.push({ category, display, entry: best });
  }

  // ── Write regions/global.m3u (the work-anywhere / India-proven list) ──
  const outLines = ["#EXTM3U"];
  for (const p of picked) {
    const logo = p.entry.raw.match(/tvg-logo="([^"]*)"/);
    const id = p.entry.raw.match(/tvg-id="([^"]*)"/);
    const attrs = [
      id ? `tvg-id="${id[1]}"` : "",
      logo ? `tvg-logo="${logo[1]}"` : "",
      `group-title="${p.category}"`,
    ]
      .filter(Boolean)
      .join(" ");
    outLines.push(`#EXTINF:-1 ${attrs},${p.display}`);
    outLines.push(p.entry.url);
  }
  const regionsDir = path.join(outDir, "regions");
  await fs.mkdir(regionsDir, { recursive: true });
  await fs.writeFile(path.join(regionsDir, "global.m3u"), outLines.join("\n") + "\n", "utf8");

  // ── Write CURATED_CHANNELS.md ──
  const byCat = new Map();
  for (const p of picked) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category).push(p);
  }
  const md = [
    "# Featured Channels",
    "",
    `Curated from the full catalog — **${picked.length} channels** kept of ${all.length} total.`,
    "",
    "Tick the ones you want to keep; tell Claude which to drop and it will re-cut the playlist.",
    "",
  ];
  for (const [cat, list] of byCat) {
    md.push(`## ${cat} (${list.length})`);
    md.push("");
    for (const p of list) {
      md.push(`- [ ] **${p.display}** — \`${p.entry.name}\` _(from ${p.entry.source})_`);
    }
    md.push("");
  }
  if (missing.length) {
    md.push("## ⚠️ Not found in catalog (skipped)");
    md.push("");
    for (const m of missing) md.push(`- ${m}`);
    md.push("");
  }
  await fs.writeFile(path.join(process.cwd(), "GLOBAL_CHANNELS.md"), md.join("\n"), "utf8");

  console.log(`Picked ${picked.length} channels into public/playlists/regions/global.m3u`);
  console.log(`Review list written to GLOBAL_CHANNELS.md`);
  if (missing.length) {
    console.log(`\n${missing.length} curated names had no match in the catalog:`);
    console.log("  " + missing.join("\n  "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * build-pluto-featured.mjs
 *
 * Builds public/playlists/featured.m3u from the Pluto TV "all countries" dump
 * at playlist-sources/plutotv_all.m3u (matthuisman / i.mjh.nz).
 *
 * Selection (TARGET total, English-majority with a multi-language mix):
 *   - English core: the US lineup, minus Spanish-language, US-local-news and
 *     shopping channels, deduped by name.
 *   - International: the rest of TARGET filled from the non-English feeds
 *     (German, French, Spanish, Italian, Latino, Português, Nordic), picked
 *     round-robin across languages so every language is represented, with
 *     recognizable brands and Pluto's lower channel numbers first.
 *
 * English channels are grouped by genre; international ones by language, so the
 * on-screen Guide stays useful. Output also writes CURATED_CHANNELS.md.
 *
 *   node scripts/build-pluto-featured.mjs
 */

import fs from "fs/promises";
import path from "path";

const SRC = path.join(process.cwd(), "playlist-sources", "plutotv_all.m3u");
const OUT = path.join(process.cwd(), "public", "playlists", "featured.m3u");
const MD = path.join(process.cwd(), "CURATED_CHANNELS.md");

const TARGET = 499;

// Language buckets -> the Pluto country feeds they draw from. International
// picks are balanced per bucket so each language gets a fair share.
const BUCKETS = {
  Spanish: ["Spain"],
  German: ["Germany"],
  French: ["France"],
  Latino: ["Mexico", "Argentina", "Chile"],
  Italian: ["Italy"],
  "Português": ["Brazil"],
  Nordic: ["Norway", "Sweden", "Denmark"],
};
const BUCKET_ORDER = Object.keys(BUCKETS);

function parse(content) {
  const lines = content.split("\n");
  const out = [];
  let cur = null;
  for (const raw of lines) {
    const t = raw.replace(/\r$/, "").trim();
    if (t.startsWith("#EXTINF")) {
      // The display name follows the last `",` — attribute values (e.g.
      // tvg-name="Murder, She Wrote") may themselves contain commas.
      const ci = t.lastIndexOf('",');
      const name = (
        ci >= 0 ? t.slice(ci + 2) : t.match(/,(.*)$/)?.[1] || ""
      ).trim();
      cur = {
        name,
        country: t.match(/group-title="([^"]*)"/)?.[1] || "",
        chno: parseInt(t.match(/tvg-chno="(\d+)"/)?.[1] || "999999", 10),
        logo: t.match(/tvg-logo="([^"]*)"/)?.[1] || "",
        id: t.match(/tvg-id="([^"]*)"/)?.[1] || "",
        url: null,
      };
    } else if (cur && t && !t.startsWith("#")) {
      cur.url = t;
      if (cur.name) out.push(cur);
      cur = null;
    }
  }
  return out;
}

/* Channels to drop from the US feed: Spanish-language, US-local news, shopping. */
function isJunkUS(name) {
  const n = name.toLowerCase();
  if (
    /en espa[nñ]ol|espa[nñ]ol|noticias|telenovel|telemundo|estrella|crimen|cr[ií]menes|misterios|reino infantil|familia del barrio|el rey rebel|sala de emergencias|construcciones|investiga|casos de|vidas extremas|flow latino|[ií]conos latinos|regional mexicano|^cine | cine |adrenalina|^m[aá]s |pluto tv novelas/.test(
      n,
    )
  )
    return true;
  if (/^cbs news /.test(n) && n !== "cbs news 24/7") return true;
  if (
    /fox local|kiro seattle|nbc los angeles news|news 12 new york|weathernation|salem news/.test(
      n,
    )
  )
    return true;
  if (/^(hsn|qvc|qvc2|shop lc)$/.test(n)) return true;
  return false;
}

/* Genre for English (US) channels — first match wins. */
const GENRE_RULES = [
  ["Anime", /anime|naruto|boruto|one piece|pok[eé]mon|sailor moon|inuyasha|yu-gi-oh|crunchyroll|hidive|transformers tv|totally turtles|go go gadget/],
  ["Kids", /kids|baby shark|peppa|nick jr|nickelodeon|lego|garfield|strawberry|little angel|ryan and friends|kartoon|forever kids|little stars|mister rogers|icarly|beach day|dinos|el reino/],
  ["News", /\bnews\b|cnn|bbc news|sky news|bloomberg|newsmax|oan|scripps|today all day|fox weather|^the first$|america's voice|blaze live/],
  ["Sports", /sport|nfl|nba|mlb|ufc|mma|pga|tennis|golf|poker|bellator|pfl|ringside|dazn|wrestling|tna|champions league|uefa|monster jam|pbr|ridepass|swerve|women’?s sports|fanduel|golazo|powernation|racer|top rank/],
  ["Music", /vevo|mtv|\bmusic\b|stingray|xite|qello|yo! mtv|tiktok radio|djazz|zenlife|\bcmt\b|classica/],
  ["Crime & Investigation", /crime|cops|csi|law & order|criminal minds|forensic|court tv|dateline|48 hours|first 48|cold case|murder|detectives|unsolved|nash bridges|s\.w\.a\.t|blue bloods|matlock|perry mason|oxygen true|dog the bounty|live pd|car chase|living with evil|mayday|air disaster/],
  ["Sci-Fi & Fantasy", /star trek|stargate|battlestar|doctor who|x-files|twilight zone|sci-fi|andromeda|supernatural|fantastic|walking dead|universal monsters|mst3k|mission impossible/],
  ["Classic TV", /classic tv|i love lucy|gunsmoke|bonanza|happy days|hogan|beverly hillbillies|andy griffith|three's company|love boat|family ties|little house|addams family|lone ranger|rifleman|wild wild west|rawhide|90210|dynasty|degrassi|western tv|heartland|matlock/],
  ["Food & Home", /food|kitchen|cooking|bobby flay|jamie oliver|martha stewart|tastemade|hell's kitchen|no reservations|property brothers|this old house|tiny house|magnolia|say yes to the dress|sweet escapes|supermarket sweep|rustic|retreats|bob ross|america's test|\bchef\b|home cooking|home\.made|homeful/],
  ["Documentary", /history|ancient aliens|modern marvels|smithsonian|nature|wicked tuna|dog whisperer|naturescape|pbs|mythbusters|unxplained|\bwild\b|builds|tough jobs|outdoor|backcountry|science|smokehouse/],
  ["Reality", /reality|housewives|jersey shore|big brother|survivor|amazing race|the challenge|love & hip hop|bad girls|next top model|love island|project runway|dr\. phil|dcc|deal or no deal|family feud|price is right|judge|hot bench|let's make a deal|game show|million dollar|storage wars|bar rescue|dating|ridiculousness|wild 'n out|nosey|pickers|pawn|ink master|teen mom|\bet\b|acapulco|cheaters/],
  ["Comedy", /comedy|sitcom|tosh|funny|cheers|frasier|sketchy|riff/],
  ["Movies", /cinema|movie|flicks|70s|80s|90s|00s|moviesphere|paramount|stories by amc|hallmark|lifetime|universal action|terror|thriller|horror|drama|feel good|western|action|adventure|romance|spotlight|icons|franchise|staff picks|cult films/],
];

function genre(name) {
  const n = name.toLowerCase();
  for (const [g, re] of GENRE_RULES) if (re.test(n)) return g;
  return "Entertainment";
}

/* Recognizable brands bubble to the front of each international lineup. */
const BRAND =
  /mtv|cnn|comedy central|nickelodeon|paramount|pluto tv|vevo|stingray|cine|master ?chef|top gear|csi|star trek|baywatch|ridiculous|catfish|rupaul|geordie|acapulco|mr bean|south park|kitchen|deal|naruto|pok[eé]mon|crime|cops|forensic|reality|horror|terror|wrestling|футбол|fútbol|fussball|fußball/i;

function buildExtinf(c, group, display) {
  const attrs = [
    c.id ? `tvg-id="${c.id}"` : "",
    c.logo ? `tvg-logo="${c.logo}"` : "",
    `group-title="${group}"`,
  ]
    .filter(Boolean)
    .join(" ");
  return `#EXTINF:-1 ${attrs},${display || c.name}`;
}

async function main() {
  const all = parse(await fs.readFile(SRC, "utf8"));

  // ── English core: US, cleaned, deduped by name ──
  const seen = new Set();
  const english = [];
  for (const c of all.filter((c) => c.country === "United States")) {
    const key = c.name.toLowerCase();
    if (isJunkUS(c.name) || seen.has(key)) continue;
    seen.add(key);
    english.push({ ...c, group: genre(c.name) });
  }

  // ── International: round-robin across language buckets, brands + low chno ──
  const sortCands = (list) =>
    [...list].sort((a, b) => {
      const ab = BRAND.test(a.name) ? 0 : 1;
      const bb = BRAND.test(b.name) ? 0 : 1;
      return ab - bb || a.chno - b.chno;
    });

  // Per-bucket candidate list, interleaving its member countries.
  const bucketCands = new Map();
  for (const [bucket, countries] of Object.entries(BUCKETS)) {
    const perCountry = countries.map((c) =>
      sortCands(all.filter((x) => x.country === c)),
    );
    const merged = [];
    for (let i = 0; ; i++) {
      let added = false;
      for (const list of perCountry) {
        if (i < list.length) {
          merged.push(list[i]);
          added = true;
        }
      }
      if (!added) break;
    }
    bucketCands.set(bucket, merged);
  }

  const need = TARGET - english.length;
  const intl = [];
  const cursor = new Map(BUCKET_ORDER.map((b) => [b, 0]));
  let exhausted = 0;
  while (intl.length < need && exhausted < BUCKET_ORDER.length) {
    exhausted = 0;
    for (const bucket of BUCKET_ORDER) {
      if (intl.length >= need) break;
      const list = bucketCands.get(bucket);
      let i = cursor.get(bucket);
      while (i < list.length && seen.has(list[i].name.toLowerCase())) i++;
      if (i >= list.length) {
        exhausted++;
        cursor.set(bucket, i);
        continue;
      }
      const c = list[i];
      seen.add(c.name.toLowerCase());
      intl.push({ ...c, group: bucket });
      cursor.set(bucket, i + 1);
    }
  }

  const picked = [...english, ...intl];

  // ── Order: genres first, then language buckets; by name within each ──
  const GENRE_ORDER = [
    "News", "Movies", "Series", "Comedy", "Crime & Investigation",
    "Sci-Fi & Fantasy", "Classic TV", "Reality", "Kids", "Anime",
    "Music", "Sports", "Food & Home", "Documentary", "Entertainment",
  ];
  const LANG_ORDER = ["Spanish", "Latino", "Português", "German", "French", "Italian", "Nordic"];
  const order = [...GENRE_ORDER, ...LANG_ORDER];
  const rank = (g) => {
    const i = order.indexOf(g);
    return i === -1 ? 999 : i;
  };
  picked.sort(
    (a, b) => rank(a.group) - rank(b.group) || a.name.localeCompare(b.name),
  );

  // ── Write featured.m3u ──
  const out = ["#EXTM3U"];
  for (const c of picked) {
    out.push(buildExtinf(c, c.group));
    out.push(c.url);
  }
  await fs.writeFile(OUT, out.join("\n") + "\n", "utf8");

  // ── Write review list ──
  const byGroup = new Map();
  for (const c of picked) {
    if (!byGroup.has(c.group)) byGroup.set(c.group, []);
    byGroup.get(c.group).push(c);
  }
  const englishCount = english.length;
  const md = [
    "# Featured Channels (Pluto TV)",
    "",
    `**${picked.length}** channels — ${englishCount} English, ${picked.length - englishCount} international.`,
    "",
  ];
  for (const g of [...GENRE_ORDER, ...LANG_ORDER]) {
    const list = byGroup.get(g);
    if (!list?.length) continue;
    md.push(`## ${g} (${list.length})`, "");
    for (const c of list) md.push(`- ${c.name}`);
    md.push("");
  }
  await fs.writeFile(MD, md.join("\n"), "utf8");

  // ── Report ──
  console.log(`Wrote ${picked.length} channels → ${path.relative(process.cwd(), OUT)}`);
  console.log(`  English (US): ${englishCount}  ·  International: ${picked.length - englishCount}`);
  const langCounts = {};
  for (const c of intl) langCounts[c.group] = (langCounts[c.group] || 0) + 1;
  console.log("  Languages:", langCounts);
  console.log("  Genres:");
  for (const g of GENRE_ORDER) {
    if (byGroup.get(g)) console.log(`    ${g}: ${byGroup.get(g).length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

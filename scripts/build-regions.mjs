#!/usr/bin/env node
/**
 * build-regions.mjs
 *
 * Generates the geo-aware Live TV playlists under public/playlists/regions/:
 *   - one file per Pluto country (us.m3u, gb.m3u, de.m3u, …) from
 *     playlist-sources/plutotv_all.m3u, genre-tagged with LOCALIZED labels
 *   - global.m3u (the work-anywhere / India-proven iptv-org list) by invoking
 *     scripts/build-featured.mjs
 *   - regions.json — the manifest the app reads to build the Region switcher
 *
 *   node scripts/build-regions.mjs
 */

import fs from "fs/promises";
import path from "path";
import { execFileSync } from "child_process";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "playlist-sources", "plutotv_all.m3u");
const OUT_DIR = path.join(ROOT, "public", "playlists", "regions");

// Pluto country feeds → region config. lang drives the genre label language;
// Nordic feeds fall back to English labels.
const COUNTRIES = [
  { code: "US", pluto: "United States", label: "United States", lang: "en" },
  { code: "GB", pluto: "United Kingdom", label: "United Kingdom", lang: "en" },
  { code: "CA", pluto: "Canada", label: "Canada", lang: "en" },
  { code: "DE", pluto: "Germany", label: "Germany", lang: "de" },
  { code: "FR", pluto: "France", label: "France", lang: "fr" },
  { code: "ES", pluto: "Spain", label: "Spain", lang: "es" },
  { code: "IT", pluto: "Italy", label: "Italy", lang: "it" },
  { code: "MX", pluto: "Mexico", label: "Mexico", lang: "es" },
  { code: "BR", pluto: "Brazil", label: "Brazil", lang: "pt" },
  { code: "AR", pluto: "Argentina", label: "Argentina", lang: "es" },
  { code: "CL", pluto: "Chile", label: "Chile", lang: "es" },
  { code: "DK", pluto: "Denmark", label: "Denmark", lang: "en" },
  { code: "SE", pluto: "Sweden", label: "Sweden", lang: "en" },
  { code: "NO", pluto: "Norway", label: "Norway", lang: "en" },
];

// Canonical genre → localized display label per language.
const LABELS = {
  en: { news: "News", movies: "Movies", series: "Series", kids: "Kids", sports: "Sports", music: "Music", crime: "Crime & Investigation", documentary: "Documentary", comedy: "Comedy", reality: "Reality", scifi: "Sci-Fi & Fantasy", classic: "Classic TV", food: "Food & Home", anime: "Anime", entertainment: "Entertainment" },
  es: { news: "Noticias", movies: "Cine", series: "Series", kids: "Niños", sports: "Deportes", music: "Música", crime: "Crimen", documentary: "Documentales", comedy: "Comedia", reality: "Reality", scifi: "Ciencia Ficción", classic: "Clásicos", food: "Cocina", anime: "Anime", entertainment: "Entretenimiento" },
  de: { news: "Nachrichten", movies: "Filme", series: "Serien", kids: "Kinder", sports: "Sport", music: "Musik", crime: "Krimi", documentary: "Doku", comedy: "Comedy", reality: "Reality", scifi: "Sci-Fi", classic: "Klassiker", food: "Kochen", anime: "Anime", entertainment: "Unterhaltung" },
  fr: { news: "Actualités", movies: "Cinéma", series: "Séries", kids: "Enfants", sports: "Sport", music: "Musique", crime: "Polar", documentary: "Documentaires", comedy: "Comédie", reality: "Téléréalité", scifi: "Science-Fiction", classic: "Classiques", food: "Cuisine", anime: "Animé", entertainment: "Divertissement" },
  it: { news: "Notizie", movies: "Cinema", series: "Serie", kids: "Bambini", sports: "Sport", music: "Musica", crime: "Crime", documentary: "Documentari", comedy: "Commedia", reality: "Reality", scifi: "Fantascienza", classic: "Classici", food: "Cucina", anime: "Anime", entertainment: "Intrattenimento" },
  pt: { news: "Notícias", movies: "Cinema", series: "Séries", kids: "Infantil", sports: "Esportes", music: "Música", crime: "Crime", documentary: "Documentários", comedy: "Comédia", reality: "Reality", scifi: "Ficção Científica", classic: "Clássicos", food: "Culinária", anime: "Anime", entertainment: "Entretenimento" },
};

// Canonical genre detection — English show-name keywords + multilingual
// keywords, first match wins.
const RULES = [
  ["anime", /anime|naruto|boruto|one piece|pok[eé]mon|sailor moon|inuyasha|yu-gi-oh|crunchyroll|hidive|transformers tv|totally turtles|dragon ball|manga/],
  ["kids", /\bkids\b|baby shark|peppa|nick ?jr|nickelodeon|\blego\b|garfield|strawberry|little angel|ryan and friends|kartoon|forever kids|little stars|mister rogers|icarly|niñ|infantil|kinder|enfants|bambini|cartoon|dibujos|zeichentrick|desenhos|\bbarn\b|junior/],
  ["news", /\bnews\b|\bcnn\b|bbc news|sky news|bloomberg|newsmax|\boan\b|scripps|today all day|fox weather|^the first$|america's voice|blaze live|noticias|notícias|nachrichten|actualit|notizie|tagesschau/],
  ["sports", /sport|\bnfl\b|\bnba\b|\bmlb\b|\bufc\b|\bmma\b|\bpga\b|tennis|golf|poker|bellator|\bpfl\b|ringside|dazn|wrestling|\btna\b|champions league|uefa|monster jam|\bpbr\b|ridepass|swerve|fanduel|golazo|powernation|racer|top rank|deporte|esporte|f[uú]tbol|fussball|fußball|calcio|\bwwe\b|boxe/],
  ["music", /vevo|\bmtv\b|\bmusic\b|stingray|xite|qello|yo! mtv|tiktok radio|djazz|zenlife|\bcmt\b|classica|música|musik|musique|musica|\bhits\b|reggae/],
  ["crime", /crime|cops|\bcsi\b|law & order|criminal minds|forensic|court tv|dateline|48 hours|first 48|cold case|murder|detectives|unsolved|nash bridges|s\.w\.a\.t|blue bloods|matlock|perry mason|oxygen true|dog the bounty|live pd|crimen|krimi|polar|policiac|kriminal|delitti/],
  ["scifi", /star trek|stargate|battlestar|doctor who|x-files|twilight zone|sci-?fi|andromeda|supernatural|fantastic|walking dead|universal monsters|mst3k|mission impossible|science.?fiction|fantascienza|ficção científica|fantasy|terror|horror|zombie/],
  ["classic", /classic|i love lucy|gunsmoke|bonanza|happy days|hogan|beverly hillbillies|andy griffith|three's company|love boat|family ties|little house|addams family|lone ranger|rifleman|wild wild west|rawhide|90210|dynasty|degrassi|western tv|heartland|clásico|clássico|klassiker|classiques|classici|retro/],
  ["food", /\bfood\b|kitchen|cooking|bobby flay|jamie oliver|martha stewart|tastemade|hell's kitchen|no reservations|property brothers|this old house|tiny house|magnolia|say yes to the dress|sweet escapes|supermarket sweep|rustic|retreats|bob ross|america's test|\bchef\b|cocina|cucina|cuisine|culinária|kochen/],
  ["documentary", /history|ancient aliens|modern marvels|smithsonian|nature|wicked tuna|dog whisperer|naturescape|\bpbs\b|mythbusters|unxplained|\bwild\b|builds|tough jobs|outdoor|backcountry|smokehouse|document|documental|documentari|doku|natur|histori|geschichte|wissen|ci[eê]ncia|science/],
  ["reality", /reality|realit|housewives|jersey shore|big brother|survivor|amazing race|the challenge|love & hip hop|bad girls|next top model|love island|project runway|dr\. phil|\bdcc\b|deal or no deal|family feud|price is right|judge|hot bench|let's make a deal|game show|million dollar|storage wars|bar rescue|dating|ridiculousness|wild 'n out|nosey|pickers|pawn|ink master|teen mom|acapulco|cheaters|telenovela|\bnovela|shore\b/],
  ["comedy", /comedy|sitcom|tosh|funny|cheers|frasier|sketchy|riff|comedia|comédie|komödie|commedia|comédia|humor|risas/],
  ["movies", /cinema|movie|flicks|moviesphere|paramount|stories by amc|hallmark|lifetime|universal action|terror|thriller|drama|feel good|western|\baction\b|adventure|romance|spotlight|icons|franchise|staff picks|cult films|\bcine|kino|\bfilm|pelicul|película|pellicole|filmes/],
  ["series", /\bserie|série|series|séries|serien/],
];

function detectGenre(name) {
  const n = name.toLowerCase();
  for (const [g, re] of RULES) if (re.test(n)) return g;
  return "entertainment";
}

function labelFor(genre, lang) {
  return (LABELS[lang] || LABELS.en)[genre] || (LABELS.en[genre] ?? "Entertainment");
}

function parse(content) {
  const lines = content.split("\n");
  const out = [];
  let cur = null;
  for (const raw of lines) {
    const t = raw.replace(/\r$/, "").trim();
    if (t.startsWith("#EXTINF")) {
      // Display name follows the last `",` (attribute values may contain commas).
      const ci = t.lastIndexOf('",');
      const name = (ci >= 0 ? t.slice(ci + 2) : t.match(/,(.*)$/)?.[1] || "").trim();
      cur = {
        name,
        country: t.match(/group-title="([^"]*)"/)?.[1] || "",
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

/* Drop Spanish-language, local-news and shopping channels from the US feed. */
function isJunkUS(name) {
  const n = name.toLowerCase();
  if (/en espa[nñ]ol|espa[nñ]ol|noticias|telenovel|telemundo|estrella|crimen|cr[ií]menes|misterios|reino infantil|familia del barrio|el rey rebel|sala de emergencias|construcciones|investiga|casos de|vidas extremas|flow latino|[ií]conos latinos|regional mexicano|^cine | cine |adrenalina|^m[aá]s |pluto tv novelas/.test(n)) return true;
  if (/^cbs news /.test(n) && n !== "cbs news 24/7") return true;
  if (/fox local|kiro seattle|nbc los angeles news|news 12 new york|weathernation|salem news/.test(n)) return true;
  if (/^(hsn|qvc|qvc2|shop lc)$/.test(n)) return true;
  return false;
}

const GENRE_ORDER = ["news", "movies", "series", "comedy", "crime", "scifi", "classic", "reality", "kids", "anime", "music", "sports", "food", "documentary", "entertainment"];

function buildExtinf(c, group) {
  const attrs = [
    c.id ? `tvg-id="${c.id}"` : "",
    c.logo ? `tvg-logo="${c.logo}"` : "",
    `group-title="${group}"`,
  ].filter(Boolean).join(" ");
  return `#EXTINF:-1 ${attrs},${c.name}`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // ── global.m3u via the existing iptv-org curation ──
  console.log("Building global.m3u (iptv-org / India-proven)…");
  execFileSync("node", ["scripts/build-featured.mjs"], { cwd: ROOT, stdio: "inherit" });

  // ── Pluto per-country files ──
  const all = parse(await fs.readFile(SRC, "utf8"));
  const regions = [
    { code: "global", label: "Global / India", file: "global.m3u", lang: "mixed" },
  ];

  for (const c of COUNTRIES) {
    const seen = new Set();
    const chans = [];
    for (const ch of all.filter((x) => x.country === c.pluto)) {
      const key = ch.name.toLowerCase();
      if (seen.has(key)) continue;
      if (c.code === "US" && isJunkUS(ch.name)) continue;
      seen.add(key);
      chans.push({ ...ch, genre: detectGenre(ch.name) });
    }
    chans.sort(
      (a, b) =>
        GENRE_ORDER.indexOf(a.genre) - GENRE_ORDER.indexOf(b.genre) ||
        a.name.localeCompare(b.name),
    );

    const lines = ["#EXTM3U"];
    for (const ch of chans) {
      lines.push(buildExtinf(ch, labelFor(ch.genre, c.lang)));
      lines.push(ch.url);
    }
    await fs.writeFile(path.join(OUT_DIR, `${c.code.toLowerCase()}.m3u`), lines.join("\n") + "\n", "utf8");
    regions.push({ code: c.code, label: c.label, file: `${c.code.toLowerCase()}.m3u`, lang: c.lang });
    console.log(`  ${c.code}  ${chans.length} channels`);
  }

  // ── manifest ──
  const manifest = {
    plutoCountries: COUNTRIES.map((c) => c.code),
    regions,
  };
  await fs.writeFile(path.join(OUT_DIR, "regions.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${regions.length} regions + manifest → ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

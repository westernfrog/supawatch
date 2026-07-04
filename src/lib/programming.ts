/* ── Daily programming ─────────────────────────────────────────────────────
   The home page below the fold is "programmed" like a TV channel: a large
   pool of curated lists (moods, decades, world cinema, networks, seasonal
   specials) from which a date-seeded shuffle picks each day's lineup. The
   seed is the calendar date, so the schedule is deterministic for the whole
   day (ISR-cacheable) and different tomorrow — regulars always find fresh
   rows without anyone editing code. */

export type SectionDef = {
  kind: "grid" | "reel";
  title: string;
  subtitle: string;
  url: string;
  mediaType?: "movie" | "tv";
};

const D = (params: string) => `/api/getDiscover?${params}`;

/* ── Pools ── */

const MOODS: SectionDef[] = [
  { kind: "reel", title: "Superhero",            subtitle: "Marvel · DC · More",   url: D("type=movie&with_keywords=9715&sort_by=popularity.desc"), mediaType: "movie" },
  { kind: "reel", title: "After Dark",           subtitle: "Horror & Fear",        url: D("type=mixed&with_genres=27&sort_by=vote_average.desc&vote_count_gte=500") },
  { kind: "grid", title: "True Crime",           subtitle: "Dark & Real",          url: D("type=mixed&with_genres=80&sort_by=vote_average.desc&vote_count_gte=500") },
  { kind: "reel", title: "Spy & Espionage",      subtitle: "Secret Missions",      url: D("type=movie&with_keywords=10249&sort_by=popularity.desc"), mediaType: "movie" },
  { kind: "reel", title: "Based on True Events", subtitle: "Real Stories",         url: D("type=mixed&with_keywords=10683&sort_by=popularity.desc") },
  { kind: "grid", title: "Post Apocalyptic",     subtitle: "End of the World",     url: D("type=mixed&with_keywords=4565&sort_by=popularity.desc") },
  { kind: "reel", title: "Documentary",          subtitle: "Unscripted Truth",     url: D("type=mixed&with_genres=99&sort_by=vote_average.desc&vote_count_gte=200") },
  { kind: "grid", title: "Miniseries",           subtitle: "One & Done",           url: D("type=tv&with_keywords=14434&sort_by=popularity.desc"), mediaType: "tv" },
  { kind: "reel", title: "Mind Benders",         subtitle: "Trust Nothing",        url: D("type=movie&with_genres=878,9648&sort_by=popularity.desc&vote_count_gte=300"), mediaType: "movie" },
  { kind: "grid", title: "Feel Good",            subtitle: "Instant Serotonin",    url: D("type=mixed&with_genres=35&sort_by=vote_average.desc&vote_count_gte=1000") },
  { kind: "reel", title: "Love Stories",         subtitle: "Hearts on Screen",     url: D("type=movie&with_genres=10749&sort_by=vote_average.desc&vote_count_gte=500"), mediaType: "movie" },
  { kind: "grid", title: "Family Movie Night",   subtitle: "All Ages Welcome",     url: D("type=mixed&with_genres=10751&sort_by=popularity.desc") },
  { kind: "reel", title: "Animated Worlds",      subtitle: "Beyond Live Action",   url: D("type=mixed&with_genres=16&sort_by=popularity.desc") },
  { kind: "reel", title: "Epic Fantasy",         subtitle: "Other Realms",         url: D("type=movie&with_genres=14&sort_by=popularity.desc&vote_count_gte=300"), mediaType: "movie" },
  { kind: "grid", title: "War Stories",          subtitle: "Courage Under Fire",   url: D("type=movie&with_genres=10752&sort_by=vote_average.desc&vote_count_gte=500"), mediaType: "movie" },
  { kind: "reel", title: "Whodunits",            subtitle: "Solve It First",       url: D("type=mixed&with_genres=9648&sort_by=popularity.desc") },
  { kind: "grid", title: "Crime Sagas",          subtitle: "The Long Game",        url: D("type=movie&with_genres=80&sort_by=vote_average.desc&vote_count_gte=1000"), mediaType: "movie" },
];

const DECADES: SectionDef[] = [
  { kind: "reel", title: "Seventies Cinema", subtitle: "New Hollywood",     url: D("type=movie&year_from=1970&year_to=1979&sort_by=vote_average.desc&vote_count_gte=500"), mediaType: "movie" },
  { kind: "reel", title: "80s Nostalgia",    subtitle: "Totally Rad",       url: D("type=mixed&year_from=1980&year_to=1989&sort_by=vote_average.desc&vote_count_gte=500") },
  { kind: "reel", title: "90s Classics",     subtitle: "Golden Era",        url: D("type=mixed&year_from=1990&year_to=1999&sort_by=vote_average.desc&vote_count_gte=1000") },
  { kind: "grid", title: "2000s Throwback",  subtitle: "Early Millennium",  url: D("type=mixed&year_from=2000&year_to=2009&sort_by=vote_average.desc&vote_count_gte=1000") },
  { kind: "reel", title: "2010s Peak",       subtitle: "Recent Classics",   url: D("type=mixed&year_from=2010&year_to=2019&sort_by=vote_average.desc&vote_count_gte=3000") },
];

const WORLD: SectionDef[] = [
  { kind: "reel", title: "Korean Wave",     subtitle: "K-Content",           url: D("type=mixed&language=ko&sort_by=popularity.desc") },
  { kind: "grid", title: "Anime",           subtitle: "Japanese Animation",  url: D("type=tv&language=ja&with_genres=16&sort_by=popularity.desc"), mediaType: "tv" },
  { kind: "reel", title: "Japanese Cinema", subtitle: "Nihon Eiga",          url: D("type=movie&language=ja&sort_by=vote_average.desc&vote_count_gte=300"), mediaType: "movie" },
  { kind: "reel", title: "Bollywood",       subtitle: "Hindi Cinema",        url: D("type=movie&language=hi&sort_by=popularity.desc"), mediaType: "movie" },
  { kind: "reel", title: "French Cinema",   subtitle: "Cinéma Français",     url: D("type=mixed&language=fr&sort_by=popularity.desc") },
  { kind: "grid", title: "Spanish Cinema",  subtitle: "En Español",          url: D("type=mixed&language=es&sort_by=popularity.desc") },
  { kind: "reel", title: "Nordic Noir",     subtitle: "Scandinavian Dark",   url: D("type=mixed&language=da&sort_by=popularity.desc") },
  { kind: "reel", title: "Italian Cinema",  subtitle: "Cinema Italiano",     url: D("type=mixed&language=it&sort_by=popularity.desc") },
  { kind: "grid", title: "German Cinema",   subtitle: "Deutsches Kino",      url: D("type=mixed&language=de&sort_by=popularity.desc") },
  { kind: "reel", title: "Chinese Cinema",  subtitle: "Huayu Dianying",      url: D("type=movie&language=zh&sort_by=popularity.desc"), mediaType: "movie" },
];

const NETWORKS: SectionDef[] = [
  { kind: "reel", title: "HBO",          subtitle: "Premium Cable",    url: D("type=tv&with_networks=49&sort_by=popularity.desc"), mediaType: "tv" },
  { kind: "reel", title: "Netflix",      subtitle: "Original Series",  url: D("type=tv&with_networks=213&sort_by=popularity.desc"), mediaType: "tv" },
  { kind: "reel", title: "Apple TV+",    subtitle: "Originals",        url: D("type=tv&with_networks=2552&sort_by=popularity.desc"), mediaType: "tv" },
  { kind: "grid", title: "Amazon Prime", subtitle: "Prime Video",      url: D("type=tv&with_networks=1024&sort_by=popularity.desc"), mediaType: "tv" },
  { kind: "grid", title: "Disney+",      subtitle: "House of Mouse",   url: D("type=tv&with_networks=2739&sort_by=popularity.desc"), mediaType: "tv" },
  { kind: "reel", title: "FX",           subtitle: "Fearless TV",      url: D("type=tv&with_networks=88&sort_by=popularity.desc"), mediaType: "tv" },
  { kind: "reel", title: "AMC",          subtitle: "Story Matters",    url: D("type=tv&with_networks=174&sort_by=popularity.desc"), mediaType: "tv" },
];

/* Month-keyed specials (0 = January). Pinned to the top of the rotation. */
const SEASONAL: Record<number, SectionDef> = {
  1: { kind: "reel", title: "Love Is in the Air",       subtitle: "Valentine Season",   url: D("type=movie&with_genres=10749&sort_by=popularity.desc&vote_count_gte=200"), mediaType: "movie" },
  5: { kind: "reel", title: "Summer Blockbusters",      subtitle: "Big & Loud",         url: D("type=movie&with_genres=28&sort_by=revenue.desc&vote_count_gte=1000"), mediaType: "movie" },
  6: { kind: "reel", title: "Summer Blockbusters",      subtitle: "Big & Loud",         url: D("type=movie&with_genres=28&sort_by=revenue.desc&vote_count_gte=1000"), mediaType: "movie" },
  7: { kind: "reel", title: "Summer Blockbusters",      subtitle: "Big & Loud",         url: D("type=movie&with_genres=28&sort_by=revenue.desc&vote_count_gte=1000"), mediaType: "movie" },
  9: { kind: "reel", title: "Halloween Marathon",       subtitle: "31 Nights of Fear",  url: D("type=mixed&with_genres=27&sort_by=popularity.desc&vote_count_gte=300") },
  11: { kind: "grid", title: "December Comfort Watch",  subtitle: "Cozy Season",        url: D("type=mixed&with_genres=10751&sort_by=vote_average.desc&vote_count_gte=500") },
};

/* Hidden-gems row seeded by a rotating year — a different vintage daily. */
function hiddenGemsOf(seedRand: () => number): SectionDef {
  const year = 1975 + Math.floor(seedRand() * 46); // 1975–2020
  return {
    kind: "grid",
    title: `Hidden Gems of ${year}`,
    subtitle: "One Year, One Vintage",
    url: D(`type=movie&year_from=${year}&year_to=${year}&sort_by=vote_average.desc&vote_count_gte=300`),
    mediaType: "movie",
  };
}

/* mulberry32 — tiny deterministic PRNG so the whole day shares one lineup. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(pool: T[], count: number, rand: () => number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export function buildDailyProgram(date = new Date()): SectionDef[] {
  const seed =
    date.getUTCFullYear() * 1000 +
    Math.floor(
      (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000,
    );
  const rand = mulberry32(seed);

  const moods = pick(MOODS, 5, rand);
  const decades = pick(DECADES, 2, rand);
  const world = pick(WORLD, 3, rand);
  const networks = pick(NETWORKS, 2, rand);
  const gems = hiddenGemsOf(rand);
  const seasonal = SEASONAL[date.getUTCMonth()];

  /* Interleave the pools so no two rows of the same flavour sit together. */
  const lineup: SectionDef[] = [];
  if (seasonal) lineup.push(seasonal);
  lineup.push(moods[0], decades[0], world[0], networks[0]);
  lineup.push(moods[1], world[1], gems, moods[2]);
  lineup.push(networks[1], decades[1], moods[3], world[2], moods[4]);

  return lineup.filter(Boolean);
}

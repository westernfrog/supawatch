/* Genre list used by the movies-page genre picker + filtered reels. */
export const GENRE_LIST: { id: string; name: string }[] = [
  { id: "28", name: "Action" },
  { id: "12", name: "Adventure" },
  { id: "16", name: "Animation" },
  { id: "35", name: "Comedy" },
  { id: "80", name: "Crime" },
  { id: "99", name: "Documentary" },
  { id: "18", name: "Drama" },
  { id: "10751", name: "Family" },
  { id: "14", name: "Fantasy" },
  { id: "36", name: "History" },
  { id: "27", name: "Horror" },
  { id: "10402", name: "Music" },
  { id: "9648", name: "Mystery" },
  { id: "10749", name: "Romance" },
  { id: "878", name: "Sci-Fi" },
  { id: "53", name: "Thriller" },
  { id: "10752", name: "War" },
  { id: "37", name: "Western" },
];

export const GENRE_NAMES: Record<string, string> = {
  ...Object.fromEntries(GENRE_LIST.map((g) => [g.id, g.name])),
  "10759": "Action & Adventure",
  "10762": "Kids",
  "10763": "News",
  "10764": "Reality",
  "10765": "Sci-Fi & Fantasy",
  "10766": "Soap",
  "10767": "Talk",
  "10768": "War & Politics",
};

import Genres from "./components/Genres";

export const metadata = {
  title: "Browse Genres",
  description:
    "Explore movies by genre. Find action, comedy, drama, horror, sci-fi, and more on Supawatch.",
  openGraph: {
    title: "Browse Movie Genres | Supawatch",
    description:
      "Explore movies by genre. Find action, comedy, drama, horror, sci-fi, and more.",
  },
};

export default function Genre() {
  const genresById = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Science Fiction",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western",
  };

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="relative lg:h-72 h-64">
          <img
            src="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Genre Poster"
            className="w-full h-full object-cover object-bottom"
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-[#010101]"></div>
          <div className="absolute inset-0 bg-linear-to-r from-black/80 via-transparent to-transparent"></div>
          <div className="absolute inset-0 top-0 flex items-end">
            <div className="lg:px-12 px-6 max-w-7xl">
              <h1 className="font-bold text-mdnichrome lg:text-6xl text-4xl tracking-tight drop-shadow-2xl">
                Top Genres
              </h1>
            </div>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-16 gap-3 lg:gap-4 lg:p-10 p-4">
        {Object.entries(genresById).map(([id, name]) => (
          <Genres key={id} genre={parseInt(id)} name={name} />
        ))}
      </section>
    </>
  );
}

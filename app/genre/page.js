import Genres from "./components/Genres";

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
      <section className="relative">
        <div className="lg:h-64 h-32 bg-white/10">
          <img
            src="https://images.unsplash.com/photo-1623018035813-9cfb5b502e04?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Search Backdrop"
            className="w-full h-full object-cover object-bottom"
          />
          <div className="absolute top-0 bg-black/30 inset-0 bg-gradient-to-b from-black/60 from-20% via-black/50 via-40% to-[#010101] to-80%"></div>
          <div className="absolute lg:inset-x-8 lg:inset-y-32 inset-x-6 inset-y-24">
            <h1 className="font-semibold lg:text-9xl text-2xl tracking-tighter lg:mb-0 mb-2">
              Genre
            </h1>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-12 gap-4 lg:p-10 p-6">
        {Object.entries(genresById).map(([id, name]) => (
          <Genres key={id} genre={parseInt(id)} name={name} />
        ))}
      </section>
    </>
  );
}

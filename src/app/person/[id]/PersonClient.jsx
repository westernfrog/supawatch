"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Calendar, MapPin, Film, ArrowLeft, LayoutGrid } from "lucide-react";
import MediaDetailDialog from "../../components/MediaDetailDialog";
import posthog from "posthog-js";

export default function PersonClient({ id, initialData }) {
  const [person, setPerson] = useState(initialData || null);
  const [movieCredits, setMovieCredits] = useState(null);
  const [showFullBio, setShowFullBio] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    async function fetchPersonData() {
      try {
        const response = await fetch(`/api/getPersonEnhanced?id=${id}`);
        const data = await response.json();
        setPerson(data.data);
        setMovieCredits(data.movieCredits);
      } catch (error) {
        console.error("Error fetching person:", error);
      }
    }
    if (id) fetchPersonData();
  }, [id]);

  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const birth = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const sortedCredits = movieCredits?.cast
    ?.filter((item) => item.poster_path)
    ?.sort((a, b) => b.popularity - a.popularity)
    ?.slice(0, 20);

  const handleOpenDialog = (item) => {
    setSelectedItem(item);
    setOpen(true);

    // PostHog: Track cast member clicked (viewing their filmography)
    posthog.capture("cast_member_clicked", {
      person_id: id,
      person_name: person?.name,
      movie_id: item.id,
      movie_title: item.title,
      character: item.character,
    });
  };

  const handleFilmographyClick = (item) => {
    // PostHog: Track filmography item clicked
    posthog.capture("filmography_item_clicked", {
      person_id: id,
      person_name: person?.name,
      movie_id: item.id,
      movie_title: item.title,
      character: item.character,
      release_year: item.release_date
        ? new Date(item.release_date).getFullYear()
        : null,
    });
  };

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

  const getGenres = (genreIds) =>
    genreIds?.map((id) => ({ id, name: genresById[id] })) || [];

  return (
    <>
      {person ? (
        <div className="min-h-screen">
          <div className="relative">
            <div className="absolute inset-0 h-125 overflow-hidden">
              {person.profile_path && (
                <img
                  src={`https://image.tmdb.org/t/p/original${person.profile_path}`}
                  alt=""
                  className="w-full h-full object-cover object-top blur-3xl opacity-30 scale-110"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-b from-[#010101]/50 via-[#010101]/80 to-[#010101]"></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-6 lg:px-12 pt-24 pb-12">
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>

              <div className="flex flex-col lg:flex-row gap-10">
                <div className="shrink-0">
                  <div className="relative w-64 lg:w-80 mx-auto lg:mx-0">
                    {person.profile_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
                        alt={person.name}
                        className="w-full aspect-2/3 object-cover rounded-xl shadow-2xl"
                      />
                    ) : (
                      <div className="w-full aspect-2/3 bg-white/10 rounded-xl flex items-center justify-center">
                        <span className="text-6xl opacity-30">👤</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div>
                    <h1 className="text-4xl lg:text-5xl font-bold text-mdnichrome tracking-tight">
                      {person.name}
                    </h1>
                    {person.known_for_department && (
                      <p className="text-lg text-neutral-400 mt-2">
                        {person.known_for_department}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4">
                    {person.birthday && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full">
                        <Calendar className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm">
                          {formatDate(person.birthday)}
                          {calculateAge(person.birthday) && (
                            <span className="text-neutral-400">
                              {" "}
                              ({calculateAge(person.birthday)} years)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {person.place_of_birth && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full">
                        <MapPin className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm">{person.place_of_birth}</span>
                      </div>
                    )}
                    {movieCredits?.cast?.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full">
                        <Film className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm">
                          {movieCredits.cast.length} Credits
                        </span>
                      </div>
                    )}
                  </div>

                  {person.biography && (
                    <div className="space-y-3">
                      <h2 className="text-xl font-semibold">Biography</h2>
                      <div className="relative">
                        <p
                          className={`text-neutral-300 leading-relaxed ${
                            !showFullBio && "line-clamp-4"
                          }`}
                        >
                          {person.biography}
                        </p>
                        {person.biography.length > 400 && (
                          <button
                            onClick={() => setShowFullBio(!showFullBio)}
                            className="text-red-500 hover:text-red-400 font-medium mt-2"
                          >
                            {showFullBio ? "Show Less" : "Read More"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {sortedCredits && sortedCredits.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 lg:px-12 py-8 lg:py-12">
              <h2 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6 text-mdnichrome">
                Known For
              </h2>
              <div className="flex gap-3 lg:gap-4 overflow-x-auto pb-4 lg:pb-6 snap-x scrollbar-hide">
                {sortedCredits.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    onClick={() => handleOpenDialog(item)}
                    className="group shrink-0 w-32 lg:w-48 snap-start cursor-pointer"
                  >
                    <div className="relative rounded-lg overflow-hidden bg-white/5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                      <img
                        src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                        alt={item.title}
                        className="w-full aspect-2/3 object-cover"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="bg-black/20 border-2 border-white/40 px-5 py-2.5 rounded-full flex items-center gap-2 font-semibold shadow-xl">
                          <LayoutGrid className="w-4 h-4" />
                          <span className="text-sm">More Info</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {movieCredits?.cast && movieCredits.cast.length > 20 && (
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-12 border-t border-white/10">
              <h2 className="text-2xl font-bold mb-6 text-mdnichrome">
                Full Filmography
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {movieCredits.cast
                  .filter((item) => item.title)
                  .sort((a, b) => {
                    const dateA = a.release_date || "0000";
                    const dateB = b.release_date || "0000";
                    return dateB.localeCompare(dateA);
                  })
                  .slice(0, 30)
                  .map((item, index) => (
                    <Link
                      key={`${item.id}-${index}`}
                      href={`/movie/${item.id}`}
                      onClick={() => handleFilmographyClick(item)}
                      className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                      <div className="shrink-0 w-12 h-16 rounded overflow-hidden bg-white/10">
                        {item.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs opacity-50">
                            🎬
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate group-hover:text-white/80">
                          {item.title}
                        </h3>
                        {item.character && (
                          <p className="text-xs text-neutral-500 truncate">
                            as {item.character}
                          </p>
                        )}
                        {item.release_date && (
                          <p className="text-xs text-neutral-600">
                            {new Date(item.release_date).getFullYear()}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="min-h-screen">
          <div className="relative max-w-7xl mx-auto px-6 lg:px-12 pt-24 pb-12">
            <div className="flex flex-col lg:flex-row gap-10">
              <div className="w-64 lg:w-80 mx-auto lg:mx-0">
                <div className="w-full aspect-2/3 bg-white/5 rounded-xl animate-pulse"></div>
              </div>
              <div className="flex-1 space-y-6">
                <div className="h-12 w-64 bg-white/5 rounded animate-pulse"></div>
                <div className="h-6 w-32 bg-white/5 rounded animate-pulse"></div>
                <div className="flex gap-4">
                  <div className="h-10 w-40 bg-white/5 rounded-full animate-pulse"></div>
                  <div className="h-10 w-40 bg-white/5 rounded-full animate-pulse"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-6 w-24 bg-white/5 rounded animate-pulse"></div>
                  <div className="h-4 w-full bg-white/5 rounded animate-pulse"></div>
                  <div className="h-4 w-full bg-white/5 rounded animate-pulse"></div>
                  <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <MediaDetailDialog
        open={open}
        onOpenChange={setOpen}
        item={selectedItem}
        mediaType="movie"
        linkPrefix="/movie"
      />
    </>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  MapPin,
  Star,
  Film,
  ArrowLeft,
  LayoutGrid,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export default function Person() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [movieCredits, setMovieCredits] = useState(null);
  const [showFullBio, setShowFullBio] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [trailer, setTrailer] = useState(null);
  const [credits, setCredits] = useState(null);
  const [logo, setLogo] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    async function fetchPerson() {
      try {
        const response = await fetch(`/api/getPeople?id=${id}`);
        const fetchedPerson = await response.json();
        setPerson(fetchedPerson.data);
      } catch (error) {
        console.error("Error fetching person:", error);
      }
    }
    if (id) fetchPerson();
  }, [id]);

  useEffect(() => {
    async function fetchMovieCredits() {
      try {
        const response = await fetch(`/api/getMovieCredits?id=${id}`);
        const fetchedMovieCredits = await response.json();
        setMovieCredits(fetchedMovieCredits.data);
      } catch (error) {
        console.error("Error fetching credits:", error);
      }
    }
    if (id) fetchMovieCredits();
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

  // Sort credits by popularity/vote count
  const sortedCredits = movieCredits?.cast
    ?.filter((item) => item.poster_path)
    ?.sort((a, b) => b.popularity - a.popularity)
    ?.slice(0, 20);

  // Fetch details when dialog opens
  useEffect(() => {
    async function fetchDetails() {
      if (selectedItem) {
        try {
          const trailerResponse = await fetch(
            `/api/getTrailer?id=${selectedItem.id}`
          );
          const trailerData = await trailerResponse.json();
          setTrailer(trailerData.key);

          const creditsResponse = await fetch(
            `/api/getCredits?id=${selectedItem.id}`
          );
          const creditsData = await creditsResponse.json();
          setCredits(creditsData);

          const logoResponse = await fetch(
            `/api/getMovieImages?id=${selectedItem.id}`
          );
          const logoData = await logoResponse.json();
          const englishLogo = logoData.data?.logos?.find(
            (logo) => logo.iso_639_1 === "en"
          );
          setLogo(englishLogo?.file_path);
        } catch (error) {
          console.error("Error fetching details:", error);
        }
      }
    }

    if (open && selectedItem) {
      fetchDetails();
    }
  }, [open, selectedItem]);

  // Start trailer after 3 seconds
  useEffect(() => {
    if (open) {
      setShowTrailer(false);
      setIsMuted(true);
      const timer = setTimeout(() => setShowTrailer(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowTrailer(false);
      setTrailer(null);
      setCredits(null);
      setLogo(null);
    }
  }, [open]);

  const handleOpenDialog = (item) => {
    setSelectedItem(item);
    setOpen(true);
  };

  const handleMuteToggle = () => {
    const iframe = document.querySelector('iframe[src*="youtube"]');
    if (iframe && iframe.contentWindow) {
      const command = isMuted
        ? '{"event":"command","func":"unMute","args":""}'
        : '{"event":"command","func":"mute","args":""}';
      iframe.contentWindow.postMessage(command, "*");
      setIsMuted(!isMuted);
    }
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
                {/* Profile Image */}
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

                  {/* Biography */}
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
                    <div className="relative rounded-lg overflow-hidden bg-white/5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-white/10">
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

      {selectedItem && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="lg:max-w-6xl max-w-[90vw] p-0 border-none bg-[#010101] overflow-hidden">
            <DialogTitle className="sr-only">
              {selectedItem.title} - Details
            </DialogTitle>
            <div className="max-h-[90vh] overflow-y-auto overscroll-contain">
              <div className="relative h-56 lg:h-125">
                {showTrailer && trailer ? (
                  <div className="absolute inset-0 overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailer}?autoplay=1&mute=1&loop=1&playlist=${trailer}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&cc_load_policy=0&autohide=1&enablejsapi=1&vq=hd1080&hd=1`}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; encrypted-media"
                      style={{
                        border: "none",
                        pointerEvents: "none",
                        transform: "scale(1.4)",
                        objectFit: "cover",
                      }}
                    ></iframe>
                  </div>
                ) : (
                  <img
                    src={`https://image.tmdb.org/t/p/original/${selectedItem.backdrop_path}`}
                    alt="Backdrop"
                    className="w-full h-full object-cover object-top"
                  />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-[#010101] from-5% to-transparent"></div>

                {/* Desktop: Logo and Watch Button overlay */}
                <div className="hidden lg:block absolute bottom-6 left-6 right-6 z-10 space-y-4">
                  {logo && (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${logo}`}
                      alt={selectedItem.title}
                      className="max-w-md max-h-24 object-contain"
                    />
                  )}
                  <Link
                    href={`/movie/${selectedItem.id}`}
                    className="inline-flex gap-2 items-center px-8 py-3 bg-white text-black rounded font-semibold hover:bg-white/90"
                  >
                    <Play className="w-5 h-5 fill-black" />
                    <span>Watch Now</span>
                  </Link>
                </div>

                {showTrailer && trailer && (
                  <button
                    onClick={handleMuteToggle}
                    className="absolute bottom-4 right-4 z-20 p-3 rounded-full border-2 border-white/60 hover:border-white bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>

              {/* Mobile: Logo and Watch Button below backdrop */}
              <div className="lg:hidden px-4 py-4 space-y-3 bg-[#010101]">
                {logo && (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${logo}`}
                    alt={selectedItem.title}
                    className="max-w-50 max-h-16 object-contain"
                  />
                )}
                <Link
                  href={`/movie/${selectedItem.id}`}
                  className="inline-flex gap-2 items-center px-6 py-2.5 bg-white text-black rounded font-semibold hover:bg-white/90 text-sm"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Watch Now</span>
                </Link>
              </div>

              <div className="relative lg:p-10 p-4">
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-wrap items-center gap-4 text-base">
                      <div className="flex items-center gap-2">
                        <span className="text-green-500 font-semibold">
                          {Math.floor(selectedItem.vote_average * 10)}% Match
                        </span>
                      </div>
                      <span className="opacity-80">
                        {selectedItem.release_date?.slice(0, 4)}
                      </span>
                    </div>
                    <p className="text-base leading-relaxed opacity-90">
                      {selectedItem.overview}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getGenres(selectedItem.genre_ids).map((genre) => (
                        <Link
                          key={genre.id}
                          href={`/genre/${genre.id}`}
                          onClick={() => setOpen(false)}
                          className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-full text-sm font-medium"
                        >
                          {genre.name}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xl font-bold">Cast</h3>
                    <div className="space-y-3">
                      {credits?.data?.cast?.slice(0, 4).map((actor) => (
                        <Link
                          key={actor.id}
                          href={`/person/${actor.id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 group"
                        >
                          <div className="relative rounded-full overflow-hidden w-10 h-10 shrink-0 bg-white/10">
                            {actor.profile_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                                alt={actor.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs opacity-50">
                                👤
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate group-hover:text-white/80">
                              {actor.name}
                            </p>
                            <p className="text-xs opacity-60 truncate">
                              {actor.character}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

"use client";

import { Play } from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

export default function Seasons(props) {
  const { id } = useParams();
  const [season, setSeason] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    async function fetchSeason() {
      try {
        const response = await fetch(
          `/api/getEpisodes?id=${id}&season=${props.season}`
        );
        const fetchedSeasonData = await response.json();
        setSeason(fetchedSeasonData.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchSeason();
  }, []);

  const closeModal = () => {
    setSelectedEpisode(null);
    console.log(selectedEpisode);
    setPlay(false);
  };

  return (
    <>
      <div className="relative space-y-2 lg:px-10 p-6">
        <h1 className="font-semibold tracking-tighter text-xl lg:text-3xl">
          {season && season.name}
        </h1>
        <p className="text-xl font-medium tracking-tight">
          {season?.episodes.length < 1 ? "This season is yet to come" : ""}
        </p>
        <div className="flex flex-row items-start gap-4 overflow-x-auto snap-x pb-3">
          {season &&
            season.episodes.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedEpisode(item);
                  setPlay(true);
                }}
                className="relative group shrink-0 snap-start p-1 lg:w-96 w-64 h-full"
              >
                <div className="relative flex flex-col">
                  <img
                    src={
                      item.still_path
                        ? `https://image.tmdb.org/t/p/w500/${item.still_path}`
                        : "https://images.unsplash.com/photo-1464639351491-a172c2aa2911?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGJsYWNrJTIwYmFja2dyb3VuZHxlbnwwfHwwfHx8MA%3D%3D"
                    }
                    alt={item.name}
                    className="w-full lg:h-64 h-40 object-cover object-center rounded-lg"
                  />
                  <div className="absolute top-2 left-2 z-10 bg-white/10 backdrop-blur-xl font-semibold px-3 py-1 rounded-full lg:text-sm text-xs">
                    #{item.episode_number} episode
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 group-hover:bg-black/80 transition duration-300 ease-in-out rounded-lg">
                    <div className="backdrop-blur-xl bg-white/10 lg:p-2 p-2 rounded-full active:scale-95 transition duration-300 ease-in-out">
                      <Play className="lg:w-8 lg:h-8 w-6 h-6 ps-1" />
                    </div>
                  </div>
                </div>
                <h1 className="lg:text-lg text-sm lg:font-semibold font-medium text-center py-3">
                  {item.name}
                </h1>
                <Dialog
                  open={play && selectedEpisode === item}
                  onOpenChange={(open) => !open && closeModal()}
                >
                  <DialogContent className="max-w-6xl lg:h-[40em] h-64 p-0 border-none">
                    <button
                      onClick={closeModal}
                      className="absolute lg:top-4 lg:right-6 top-2 right-2 z-50 flex items-center gap-1 font-bold tracking-tighter bg-white/80 backdrop-blur-xl px-3 py-1 rounded-full text-neutral-800 text-lg"
                    >
                      <span className="lg:block hidden">Close</span>
                      <X className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                    <iframe
                      className="w-full h-full"
                      src={`https://vidsrcme.ru/embed/tv?tmdb=${id}&season=${item.season_number}&episode=${item.episode_number}?autoPlay=false`}
                      allowFullScreen
                    ></iframe>
                  </DialogContent>
                </Dialog>
              </button>
            ))}
        </div>
      </div>
    </>
  );
}

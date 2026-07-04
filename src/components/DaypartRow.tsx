"use client";

import { useEffect, useState } from "react";
import ShowReel from "@/components/ShowReel";

/* A reel programmed to the viewer's local clock — cartoons with morning
   coffee, blockbusters in primetime, horror after midnight. Resolved
   after mount so the server-rendered page stays cacheable for everyone. */

type Daypart = {
  title: string;
  subtitle: string;
  url: string;
};

function daypartFor(hour: number): Daypart {
  if (hour >= 5 && hour < 11) {
    return {
      title: "Morning Watch",
      subtitle: "Ease Into the Day",
      url: "/api/getDiscover?type=mixed&with_genres=16&sort_by=popularity.desc",
    };
  }
  if (hour >= 11 && hour < 17) {
    return {
      title: "Midday Escape",
      subtitle: "Adventure Hour",
      url: "/api/getDiscover?type=movie&with_genres=12&sort_by=popularity.desc&vote_count_gte=300",
    };
  }
  if (hour >= 17 && hour < 22) {
    return {
      title: "Primetime Tonight",
      subtitle: "The Evening Slot",
      url: "/api/getDiscover?type=mixed&with_genres=18&sort_by=popularity.desc&vote_count_gte=1000",
    };
  }
  return {
    title: "Late Night Chills",
    subtitle: "After Hours",
    url: "/api/getDiscover?type=mixed&with_genres=27&sort_by=vote_average.desc&vote_count_gte=500",
  };
}

export default function DaypartRow() {
  const [daypart, setDaypart] = useState<Daypart | null>(null);

  useEffect(() => {
    queueMicrotask(() => setDaypart(daypartFor(new Date().getHours())));
  }, []);

  if (!daypart) return null;

  return (
    <ShowReel
      title={daypart.title}
      subtitle={daypart.subtitle}
      fetchUrl={daypart.url}
    />
  );
}

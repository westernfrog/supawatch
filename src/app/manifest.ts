import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/app-name";
import { APP_ICON, APP_ICON_TYPE } from "@/lib/app-icon";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Explore films, series, trailers, recommendations, and live channels.",
    start_url: "/",
    display: "standalone",
    background_color: "#010101",
    theme_color: "#010101",
    icons: [
      {
        src: APP_ICON,
        sizes: "any",
        ...(APP_ICON_TYPE ? { type: APP_ICON_TYPE } : {}),
      },
    ],
  };
}

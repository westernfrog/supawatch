import { type NextRequest } from "next/server";
import { countryFromHeaders, resolveRegion } from "@/lib/geo";

function regionResponse(region: string) {
  return Response.json(
    { region },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const fromHeaders = countryFromHeaders(request.headers);
  if (fromHeaders) return regionResponse(fromHeaders);

  if (process.env.NODE_ENV !== "production") {
    try {
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0].trim();
      const url = ip
        ? `http://ip-api.com/json/${ip}?fields=countryCode`
        : "http://ip-api.com/json/?fields=countryCode";
      const res = await fetch(url, { signal: AbortSignal.timeout(1500), cache: "no-store" });
      const { countryCode } = await res.json();
      if (countryCode) return regionResponse(resolveRegion(countryCode));
    } catch {
      /* fall through */
    }
  }

  return regionResponse("US");
}

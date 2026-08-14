import { type NextRequest } from "next/server";
import { countryFromHeaders, resolveRegionOrNull } from "@/lib/geo";

/**
 * `region` is always a usable country code so TMDB callers can pass it straight
 * through; `detected` says whether it was actually resolved or is just the "US"
 * fallback. Anything picking *content* by country should check `detected` —
 * otherwise a failed lookup silently reads as "this visitor is American".
 */
function regionResponse(region: string, detected: boolean) {
  return Response.json(
    { region, detected },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const fromHeaders = countryFromHeaders(request.headers);
  if (fromHeaders) return regionResponse(fromHeaders, true);

  if (process.env.NODE_ENV !== "production") {
    try {
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0].trim();
      const url = ip
        ? `http://ip-api.com/json/${ip}?fields=countryCode`
        : "http://ip-api.com/json/?fields=countryCode";
      const res = await fetch(url, {
        signal: AbortSignal.timeout(1500),
        cache: "no-store",
      });
      const { countryCode } = await res.json();
      const resolved = resolveRegionOrNull(countryCode);
      if (resolved) return regionResponse(resolved, true);
    } catch {
      /* fall through */
    }
  }

  return regionResponse("US", false);
}

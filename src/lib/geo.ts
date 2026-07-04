// Shared geo helpers — region detection from edge headers.
// Used by the /api/getRegion route and the Live TV server component so both
// resolve country codes the same way.

// ISO 3166-1 alpha-2 → TMDB region code mapping (TMDB uses the same codes).
// Validated so we never pass arbitrary strings downstream.
export const VALID_REGIONS = new Set([
  "AD","AE","AF","AG","AL","AM","AO","AR","AT","AU","AZ","BA","BB","BD","BE",
  "BF","BG","BH","BI","BJ","BN","BO","BR","BS","BT","BW","BY","BZ","CA","CD",
  "CF","CG","CH","CI","CL","CM","CN","CO","CR","CU","CV","CY","CZ","DE","DJ",
  "DK","DM","DO","DZ","EC","EE","EG","ER","ES","ET","FI","FJ","FM","FR","GA",
  "GB","GD","GE","GH","GM","GN","GQ","GR","GT","GW","GY","HN","HR","HT","HU",
  "ID","IE","IL","IN","IQ","IR","IS","IT","JM","JO","JP","KE","KG","KH","KI",
  "KM","KN","KP","KR","KW","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU",
  "LV","LY","MA","MC","MD","ME","MG","MH","MK","ML","MM","MN","MR","MT","MU",
  "MV","MW","MX","MY","MZ","NA","NE","NG","NI","NL","NO","NP","NR","NZ","OM",
  "PA","PE","PG","PH","PK","PL","PS","PT","PW","PY","QA","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SI","SK","SL","SM","SN","SO","SR","SS","ST",
  "SV","SY","SZ","TD","TG","TH","TJ","TL","TM","TN","TO","TR","TT","TV","TZ",
  "UA","UG","US","UY","UZ","VA","VC","VE","VN","VU","WS","YE","ZA","ZM","ZW",
]);

/** Normalize a raw country code to a valid ISO-2 code, defaulting to "US". */
export function resolveRegion(code: string | null | undefined): string {
  if (!code) return "US";
  const upper = code.toUpperCase();
  return VALID_REGIONS.has(upper) ? upper : "US";
}

type HeaderGetter = { get(name: string): string | null };

/**
 * Country (ISO-2) from edge geo headers, or null when none are present
 * (e.g. local dev). Callers can then fall back to an IP lookup or a default.
 */
export function countryFromHeaders(h: HeaderGetter): string | null {
  const vercel = h.get("x-vercel-ip-country");
  if (vercel) return resolveRegion(vercel);

  const cf = h.get("cf-ipcountry");
  if (cf && cf !== "XX" && cf !== "T1") return resolveRegion(cf);

  return null;
}

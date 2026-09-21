export const APP_ICON =
  process.env.NEXT_PUBLIC_PWA_ICON?.trim() || "/logo.ico";

const iconExtension = APP_ICON.split(/[?#]/, 1)[0].split(".").pop()?.toLowerCase();

export const APP_ICON_TYPE = {
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  ico: "image/x-icon",
}[iconExtension ?? ""];

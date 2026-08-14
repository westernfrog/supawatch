/**
 * Minimal ID3v2 reader for the timed metadata HLS streams carry.
 *
 * hls.js hands us raw ID3 payloads from FRAG_PARSING_METADATA but exposes no
 * parser of its own, and a full ID3 library is far more than this needs — we
 * only want the track and artist that music and radio feeds broadcast. So this
 * reads text frames and nothing else, and gives up quietly the moment anything
 * looks wrong: a garbled tag should leave the strip blank, never break playback.
 */

export interface Id3Text {
  title?: string;
  artist?: string;
}

/** ID3 sizes are "syncsafe": 7 bits per byte, top bit always clear. */
function syncsafe(b: Uint8Array, at: number): number {
  return (
    ((b[at] & 0x7f) << 21) |
    ((b[at + 1] & 0x7f) << 14) |
    ((b[at + 2] & 0x7f) << 7) |
    (b[at + 3] & 0x7f)
  );
}

function be32(b: Uint8Array, at: number): number {
  return (
    ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0
  );
}

/** A text frame leads with an encoding byte; the rest is the string. */
function decodeText(body: Uint8Array): string {
  if (body.length < 2) return "";
  const encoding = body[0];
  const payload = body.subarray(1);
  const label =
    encoding === 0
      ? "iso-8859-1"
      : encoding === 1
        ? "utf-16"
        : encoding === 2
          ? "utf-16be"
          : "utf-8";
  let text: string;
  try {
    text = new TextDecoder(label).decode(payload);
  } catch {
    text = new TextDecoder().decode(payload);
  }
  // Frames are null-padded, and TXXX-style frames pack description\0value.
  const parts = text.split("\0").filter((s) => s.trim().length > 0);
  return (parts[parts.length - 1] ?? "").trim();
}

export function parseId3(bytes: Uint8Array): Id3Text | null {
  try {
    // "ID3" magic, then version(2) flags(1) size(4).
    if (bytes.length < 10) return null;
    if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null;

    const major = bytes[3];
    const end = Math.min(bytes.length, 10 + syncsafe(bytes, 6));
    const out: Id3Text = {};

    let at = 10;
    while (at + 10 <= end) {
      const id = String.fromCharCode(
        bytes[at],
        bytes[at + 1],
        bytes[at + 2],
        bytes[at + 3],
      );
      // Padding is zero bytes, so a non-frame id means we have reached it.
      if (!/^[A-Z][A-Z0-9]{3}$/.test(id)) break;

      // v2.4 made frame sizes syncsafe too; v2.3 left them plain big-endian.
      const size = major >= 4 ? syncsafe(bytes, at + 4) : be32(bytes, at + 4);
      if (size <= 0 || at + 10 + size > end) break;

      if (id === "TIT2" || id === "TPE1") {
        const value = decodeText(bytes.subarray(at + 10, at + 10 + size));
        if (value) {
          if (id === "TIT2") out.title = value;
          else out.artist = value;
        }
      }

      at += 10 + size;
    }

    return out.title || out.artist ? out : null;
  } catch {
    return null;
  }
}

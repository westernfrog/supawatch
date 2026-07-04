#!/usr/bin/env node
/**
 * prune-dead-channels.mjs
 *
 * Probes every stream URL in the playlists under public/playlists and rewrites
 * each file keeping only the channels that respond. Originals are backed up to
 * ./playlist-backups/<timestamp>/ before anything is overwritten.
 *
 * Usage (run from the supawatch project root):
 *   node scripts/prune-dead-channels.mjs                  # check + prune every playlist
 *   node scripts/prune-dead-channels.mjs --dry-run        # report only, write nothing
 *   node scripts/prune-dead-channels.mjs index.m3u news.m3u
 *   node scripts/prune-dead-channels.mjs --deep           # also validate a variant + first segment
 *   node scripts/prune-dead-channels.mjs --concurrency=40 --timeout=8000 --retries=1
 *
 * Keep --concurrency around 40. Higher sustained concurrency saturated the local
 * network during testing and falsely flagged many working channels as dead.
 *
 * Notes:
 *   - "Working" = the manifest is reachable and contains #EXTM3U (or, for direct
 *     streams, the URL responds 2xx). With --deep it also fetches a variant
 *     playlist and the first segment. The check runs from Node, so it cannot see
 *     browser CORS restrictions — the live page's runtime auto-hide covers those.
 */

import fs from "fs/promises";
import path from "path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function parseArgs(argv) {
  const o = {
    timeoutMs: 10000,
    retries: 1,
    deep: false,
    // 40 is the empirically safe ceiling here — higher sustained concurrency
    // saturated the local network/NAT table and produced false "dead" results.
    concurrency: 40,
    dryRun: false,
    files: [],
  };
  for (const a of argv) {
    if (a === "--dry-run") o.dryRun = true;
    else if (a === "--deep") o.deep = true;
    else if (a.startsWith("--timeout=")) o.timeoutMs = Number(a.slice(10));
    else if (a.startsWith("--concurrency=")) o.concurrency = Number(a.slice(14));
    else if (a.startsWith("--retries=")) o.retries = Number(a.slice(10));
    else if (a.startsWith("--file=")) o.files.push(a.slice(7));
    else if (!a.startsWith("--")) o.files.push(a);
  }
  return o;
}

/** Split an .m3u/.m3u8 into a header and a list of { meta, url } channel entries. */
function parseM3U(content) {
  const lines = content.split("\n").map((l) => l.replace(/\r$/, ""));
  const header = [];
  const entries = [];
  let i = 0;
  while (i < lines.length && !lines[i].trim().startsWith("#EXTINF")) {
    header.push(lines[i]);
    i++;
  }
  let cur = null;
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith("#EXTINF")) {
      cur = { meta: [lines[i]], url: null };
      entries.push(cur);
    } else if (cur && cur.url === null) {
      if (t === "") continue;
      if (t.startsWith("#")) cur.meta.push(lines[i]);
      else cur.url = t;
    }
  }
  return { header, entries: entries.filter((e) => e.url) };
}

function serialize(header, entries) {
  const parts = [];
  const head = header.join("\n").replace(/\s+$/, "");
  if (head) parts.push(head);
  for (const e of entries) {
    parts.push(e.meta.join("\n"));
    parts.push(e.url);
  }
  return parts.join("\n") + "\n";
}

function firstUrlLine(text) {
  for (const raw of text.split("\n")) {
    const t = raw.trim();
    if (t && !t.startsWith("#")) return t;
  }
  return null;
}

function looksLikeM3U(res, url) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  return ct.includes("mpegurl") || ct.includes("m3u") || /\.m3u8?(\?|$)/i.test(url);
}

async function fetchWithTimeout(url, opts, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "*/*", ...headers },
    });
    return { res, clear: () => clearTimeout(timer) };
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function deepCheck(baseUrl, text, opts) {
  let mediaUrl = baseUrl;
  let mediaText = text;
  if (text.includes("#EXT-X-STREAM-INF")) {
    const variant = firstUrlLine(text);
    if (!variant) return false;
    mediaUrl = new URL(variant, baseUrl).href;
    const { res, clear } = await fetchWithTimeout(mediaUrl, opts);
    try {
      if (!res.ok) return false;
      mediaText = await res.text();
    } finally {
      clear();
    }
  }
  const seg = firstUrlLine(mediaText);
  if (!seg) return false;
  const segUrl = new URL(seg, mediaUrl).href;
  const { res, clear } = await fetchWithTimeout(segUrl, opts, { Range: "bytes=0-1" });
  try {
    return res.ok; // 200 or 206
  } finally {
    try {
      await res.body?.cancel();
    } catch {}
    clear();
  }
}

async function isAlive(url, opts) {
  const { res, clear } = await fetchWithTimeout(url, opts);
  try {
    if (!res.ok) return false;
    if (!looksLikeM3U(res, url)) return true; // reachable direct stream
    const text = await res.text();
    if (!text.includes("#EXTM3U")) return false;
    if (!opts.deep) return true;
    return await deepCheck(url, text, opts);
  } finally {
    try {
      await res.body?.cancel();
    } catch {}
    clear();
  }
}

/** Definitive failures (4xx/5xx) don't retry; only thrown errors (timeout/DNS/conn) do. */
async function checkChannel(url, opts) {
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await isAlive(url, opts);
    } catch {
      if (attempt === opts.retries) return false;
    }
  }
  return false;
}

async function mapPool(items, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) break;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const dir = path.join(process.cwd(), "public", "playlists", "regions");

  let fileNames = opts.files;
  if (fileNames.length === 0) {
    const all = await fs.readdir(dir);
    fileNames = all.filter((f) => /\.m3u8?$/i.test(f));
  }
  if (fileNames.length === 0) {
    console.error(`No .m3u/.m3u8 files found in ${dir}`);
    process.exit(1);
  }

  console.log(
    `Mode: ${opts.dryRun ? "DRY RUN (no writes)" : "PRUNE"} | ${opts.deep ? "deep" : "manifest"} check | ` +
      `concurrency=${opts.concurrency} timeout=${opts.timeoutMs}ms retries=${opts.retries}`,
  );

  // Parse every file, then dedupe URLs so shared streams are probed once.
  const files = [];
  for (const name of fileNames) {
    const content = await fs.readFile(path.join(dir, name), "utf8");
    files.push({ name, ...parseM3U(content) });
  }
  const uniqueUrls = [...new Set(files.flatMap((f) => f.entries.map((e) => e.url)))];
  console.log(`Probing ${uniqueUrls.length} unique stream URLs across ${files.length} file(s)…\n`);

  const aliveMap = new Map();
  let done = 0;
  let aliveCount = 0;
  const started = Date.now();
  await mapPool(uniqueUrls, opts.concurrency, async (url) => {
    const alive = await checkChannel(url, opts);
    aliveMap.set(url, alive);
    done++;
    if (alive) aliveCount++;
    if (done % 100 === 0 || done === uniqueUrls.length) {
      const pct = ((done / uniqueUrls.length) * 100).toFixed(1);
      const rate = (done / ((Date.now() - started) / 1000)).toFixed(0);
      process.stdout.write(
        `\r  ${done}/${uniqueUrls.length} (${pct}%) · alive ${aliveCount} · dead ${done - aliveCount} · ${rate}/s   `,
      );
    }
  });
  process.stdout.write("\n\n");

  // Rewrite each file with only the surviving channels.
  let backupDir = null;
  let totalKept = 0;
  let totalRemoved = 0;
  for (const f of files) {
    const kept = f.entries.filter((e) => aliveMap.get(e.url));
    const removed = f.entries.length - kept.length;
    totalKept += kept.length;
    totalRemoved += removed;
    console.log(`  ${f.name}: kept ${kept.length}, removed ${removed} (was ${f.entries.length})`);

    if (opts.dryRun || removed === 0) continue;

    if (!backupDir) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      backupDir = path.join(process.cwd(), "playlist-backups", stamp);
      await fs.mkdir(backupDir, { recursive: true });
    }
    await fs.copyFile(path.join(dir, f.name), path.join(backupDir, f.name));
    await fs.writeFile(path.join(dir, f.name), serialize(f.header, kept), "utf8");
  }

  console.log(
    `\nDone. Kept ${totalKept}, removed ${totalRemoved}.` +
      (opts.dryRun
        ? " (dry run — nothing written)"
        : backupDir
          ? `\nBackups saved to: ${path.relative(process.cwd(), backupDir)}`
          : "\nNo changes written (no dead channels)."),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

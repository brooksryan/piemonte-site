import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SITE_ROOT = join(__dirname, '..');
const BEACH_SEEDS_DIR = join(SITE_ROOT, 'src', 'data', 'seeds', 'beach');

const DESCRIPTION_PREFIX = 'https://commons.wikimedia.org/wiki/File:';
const USER_AGENT = 'piemonte-site/1.0 (https://github.com/brooksryan/piemonte-site)';

interface CommonsImageInfo {
  url?: unknown;
}

interface CommonsPage {
  imageinfo?: unknown;
}

interface CommonsResponse {
  query?: { pages?: Record<string, unknown> };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractImageUrl(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const query = (payload as CommonsResponse).query;
  if (!isRecord(query)) return null;
  const pages = query.pages;
  if (!isRecord(pages)) return null;
  const pageKeys = Object.keys(pages);
  if (pageKeys.length === 0) return null;
  const firstPage = pages[pageKeys[0]];
  if (!isRecord(firstPage)) return null;
  const imageinfo = (firstPage as CommonsPage).imageinfo;
  if (!Array.isArray(imageinfo) || imageinfo.length === 0) return null;
  const first = imageinfo[0];
  if (!isRecord(first)) return null;
  const url = (first as CommonsImageInfo).url;
  if (typeof url !== 'string' || url.length === 0) return null;
  return url;
}

async function resolveCommonsUrl(filename: string): Promise<string | null> {
  const apiUrl =
    'https://commons.wikimedia.org/w/api.php?action=query&titles=' +
    encodeURIComponent('File:' + filename) +
    '&prop=imageinfo&iiprop=url&format=json';
  const res = await fetch(apiUrl, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) {
    console.warn(`API request failed for ${filename}: ${res.status} ${res.statusText}`);
    return null;
  }
  const payload: unknown = await res.json();
  return extractImageUrl(payload);
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function jsonEscape(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

async function main(): Promise<void> {
  const entries = await readdir(BEACH_SEEDS_DIR);
  const jsonFiles = entries.filter((name) => name.endsWith('.json')).sort();

  let candidates = 0;
  let resolved = 0;

  for (const file of jsonFiles) {
    const path = join(BEACH_SEEDS_DIR, file);
    const raw = await readFile(path, 'utf-8');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn(`${file}: failed to parse JSON, skipping (${String(err)})`);
      continue;
    }

    if (!isRecord(parsed)) continue;
    const imageUrl = parsed.imageUrl;
    if (typeof imageUrl !== 'string') continue;
    if (!imageUrl.startsWith(DESCRIPTION_PREFIX)) continue;

    candidates += 1;
    const filename = imageUrl.slice(DESCRIPTION_PREFIX.length);
    const slug = typeof parsed.slug === 'string' ? parsed.slug : file.replace(/\.json$/, '');

    const newUrl = await resolveCommonsUrl(filename);
    if (newUrl === null) {
      console.warn(`${slug}: could not resolve ${imageUrl}, skipping`);
      continue;
    }

    // Surgical string replacement preserves the original file's whitespace,
    // numeric formatting (e.g. 44.000 vs 44), and any other quirks.
    const oldEncoded = jsonEscape(imageUrl);
    const newEncoded = jsonEscape(newUrl);
    const pattern = new RegExp(
      '("imageUrl"\\s*:\\s*")' + escapeForRegex(oldEncoded) + '(")',
    );
    if (!pattern.test(raw)) {
      console.warn(`${slug}: could not locate imageUrl line for surgical replace, skipping`);
      continue;
    }
    const next = raw.replace(pattern, `$1${newEncoded}$2`);

    await writeFile(path, next, 'utf-8');
    console.log(`${slug}: ${imageUrl} → ${newUrl}`);
    resolved += 1;
  }

  console.log(`resolved ${resolved} of ${candidates}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

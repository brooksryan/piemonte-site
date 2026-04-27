/**
 * regen-search-index.ts
 *
 * Walks site/src/data/seeds/**\/*.json on disk and rebuilds
 * site/src/data/search-index.json from the parsed seeds. The field-extraction
 * rules mirror the search-index emission block in
 * scripts/generate-seeds.ts so that consumers (e.g. the search overlay) see
 * no shape drift.
 *
 * Unlike generate-seeds.ts this script is non-destructive: it never writes
 * inside site/src/data/seeds/. It exists because generate-seeds.ts has a known
 * bug that strips hand-authored fields (mapPin/imageUrl/imageCredit) from 14
 * v1.5 seeds when re-run. Use this script instead when only the index needs
 * to be refreshed.
 */
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { SeedSchema, SearchRecordSchema, type Seed, type SearchRecord } from '../src/data/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_ROOT = path.resolve(__dirname, '..');
const SEEDS_DIR = path.join(SITE_ROOT, 'src', 'data', 'seeds');
const INDEX_PATH = path.join(SITE_ROOT, 'src', 'data', 'search-index.json');

// ─── Walk seeds dir ───────────────────────────────────────────────────────────
function walkJsonFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

const seedFiles = walkJsonFiles(SEEDS_DIR).sort();

// ─── Parse and validate every seed ────────────────────────────────────────────
const seeds: Seed[] = seedFiles.map((file) => {
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
  try {
    return SeedSchema.parse(raw);
  } catch (err) {
    console.error(`failed to parse seed: ${path.relative(SITE_ROOT, file)}`);
    throw err;
  }
});

// ─── Build search index (mirrors generate-seeds.ts emission block) ────────────
const searchIndex: SearchRecord[] = seeds.map((seed) => {
  const tags: string[] = [seed.type, seed.region];

  if ('town' in seed && seed.town) tags.push(seed.town);
  if ('register' in seed && seed.register) tags.push(seed.register);
  if ('character' in seed && seed.character) tags.push(seed.character);
  if ('category' in seed && seed.category) tags.push(seed.category);
  if ('base' in seed && seed.base) tags.push(seed.base);
  if ('platform' in seed && seed.platform) tags.push(seed.platform);
  if ('kind' in seed && seed.kind) tags.push(seed.kind);

  const record: SearchRecord = {
    slug: seed.slug,
    type: seed.type,
    name: seed.name,
    region: seed.region,
    tags: [...new Set(tags)],
  };

  if ('town' in seed && seed.town) record.town = seed.town;

  return SearchRecordSchema.parse(record);
});

// ─── Write ───────────────────────────────────────────────────────────────────
fs.writeFileSync(INDEX_PATH, JSON.stringify(searchIndex, null, 2) + '\n', 'utf-8');

console.log(`wrote ${searchIndex.length} search records to ${path.relative(SITE_ROOT, INDEX_PATH)} from ${seedFiles.length} seed files`);

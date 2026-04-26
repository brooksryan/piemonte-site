/// <reference types="vite/client" />
import { z } from 'zod';
import { SeedSchema, SearchRecordSchema } from './schemas.js';
import type { Seed, SearchRecord, EntityType, Region } from './schemas.js';

// Re-export types for consumers of this module
export type { Seed, SearchRecord, EntityType, Region };

// Vite eager glob import — picks up every seed JSON at build time
const seedModules = import.meta.glob('./seeds/**/*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>;

// Validate and collect all seeds
function loadSeeds(): Seed[] {
  const result: Seed[] = [];

  for (const [filePath, mod] of Object.entries(seedModules)) {
    const raw = mod.default ?? mod;
    const parsed = SeedSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Seed validation failed for ${filePath}:\n${parsed.error.message}`,
      );
    }
    result.push(parsed.data);
  }

  return result;
}

export const seeds: Seed[] = loadSeeds();

export const seedsByType: Record<EntityType, Seed[]> = {
  town: [],
  lodging: [],
  restaurant: [],
  winery: [],
  beach: [],
  map: [],
  drive: [],
  'cultural-site': [],
  'region-narrative': [],
};

for (const seed of seeds) {
  seedsByType[seed.type].push(seed);
}

export function getSeed(type: EntityType, slug: string): Seed | undefined {
  return seedsByType[type].find(s => s.slug === slug);
}

// Search index — imported directly from the generated JSON file
import rawSearchIndex from './search-index.json';

export const searchIndex: SearchRecord[] = z.array(SearchRecordSchema).parse(rawSearchIndex);

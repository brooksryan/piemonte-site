import type { Seed } from '../data/schemas';
import type { Favorite } from './api';

const BASE_TO_TOWNS: Record<string, string[]> = {
  'alba-langhe': [
    'Alba',
    'Barolo',
    'La Morra',
    "Monforte d'Alba",
    'Castiglione Falletto',
    "Serralunga d'Alba",
    'Barbaresco',
    'Treiso',
    'Neive',
    "Diano d'Alba",
    'Grinzane Cavour',
  ],
  sestri: ['Sestri Levante', 'Camogli'],
  finale: ['Finale Ligure', 'Varigotti', 'Noli', 'Spotorno', 'Bergeggi', 'Albenga', 'Alassio', 'Laigueglia'],
  milan: ['Milan', 'Milano'],
  turin: ['Turin', 'Torino'],
  mxp: [],
};

const EXCLUDED_RELATED_TYPES: ReadonlySet<Seed['type']> = new Set<Seed['type']>([
  'map',
  'drive',
  'region-narrative',
]);

const MAX_RELATED = 12;

type TownBackedSeed = Extract<Seed, { town: string }>;

function seedKey(seed: Pick<Seed, 'type' | 'slug'>): string {
  return `${seed.type}:${seed.slug}`;
}

function favoriteKey(favorite: Pick<Favorite, 'entity_type' | 'entity_slug'>): string {
  return `${favorite.entity_type}:${favorite.entity_slug}`;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function boundedTownMatch(anchorName: string, candidateTown: string): boolean {
  if (!anchorName || !candidateTown) return false;
  const a = escapeRegex(anchorName);
  const t = escapeRegex(candidateTown);
  const reA = new RegExp('\\b' + a + '\\b', 'i');
  const reT = new RegExp('\\b' + t + '\\b', 'i');
  return reA.test(candidateTown) || reT.test(anchorName);
}

function hasTownField(seed: Seed): seed is TownBackedSeed {
  return 'town' in seed;
}

function containsNormalized(values: readonly string[], value: string): boolean {
  const normalizedValue = normalize(value);
  return values.some(candidate => normalize(candidate) === normalizedValue);
}

function containsAnchorSubstring(name: string, anchorNames: readonly string[]): boolean {
  const normalizedName = normalize(name);
  return anchorNames.some(anchorName => normalizedName.includes(normalize(anchorName)));
}

function baseTownNames(base: string): readonly string[] {
  return BASE_TO_TOWNS[base] ?? [];
}

function baseIntersectsAnchorNames(base: string, anchorNames: readonly string[]): boolean {
  const towns = baseTownNames(base);
  return towns.some(town => containsNormalized(anchorNames, town));
}

function getAnchorTownNames(current: Seed): readonly string[] {
  if (current.type === 'town') {
    return [current.name];
  }

  if (current.type === 'lodging') {
    return baseTownNames(current.base);
  }

  if (hasTownField(current)) {
    return [current.town];
  }

  return [];
}

function matchesTownSlug(current: Seed, candidate: Seed): boolean {
  return current.type === 'town' && hasTownField(candidate) && normalize(candidate.town) === normalize(current.slug);
}

function matchesAnchorCriteria(current: Seed, candidate: Seed, anchorNames: readonly string[]): boolean {
  if (hasTownField(candidate) && anchorNames.some(name => boundedTownMatch(name, candidate.town))) {
    return true;
  }

  if (matchesTownSlug(current, candidate)) {
    return true;
  }

  if (containsAnchorSubstring(candidate.name, anchorNames)) {
    return true;
  }

  if (candidate.type === 'lodging' && baseIntersectsAnchorNames(candidate.base, anchorNames)) {
    return true;
  }

  return candidate.type === 'town' && containsNormalized(anchorNames, candidate.name);
}

function compareByName(a: Seed, b: Seed): number {
  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  if (byName !== 0) return byName;
  return seedKey(a).localeCompare(seedKey(b), undefined, { sensitivity: 'base' });
}

function getFavoriteTimestamps(favorites: readonly Favorite[]): Map<string, number> {
  const timestamps = new Map<string, number>();

  for (const favorite of favorites) {
    const key = favoriteKey(favorite);
    const timestamp = Date.parse(favorite.created_at);
    const existing = timestamps.get(key);

    if (existing === undefined || Number.isNaN(existing) || timestamp > existing) {
      timestamps.set(key, timestamp);
    }
  }

  return timestamps;
}

function timestampForSeed(seed: Seed, timestamps: ReadonlyMap<string, number>): number {
  const timestamp = timestamps.get(seedKey(seed));
  return timestamp !== undefined && Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function orderRelated(candidates: readonly Seed[], favorites: readonly Favorite[]): Seed[] {
  const favoriteTimestamps = getFavoriteTimestamps(favorites);
  const favoriteCandidates: Seed[] = [];
  const remainingCandidates: Seed[] = [];

  for (const candidate of candidates) {
    if (favoriteTimestamps.has(seedKey(candidate))) {
      favoriteCandidates.push(candidate);
    } else {
      remainingCandidates.push(candidate);
    }
  }

  favoriteCandidates.sort((a, b) => {
    const aTimestamp = timestampForSeed(a, favoriteTimestamps);
    const bTimestamp = timestampForSeed(b, favoriteTimestamps);

    if (aTimestamp !== bTimestamp) {
      return bTimestamp > aTimestamp ? 1 : -1;
    }

    return compareByName(a, b);
  });
  remainingCandidates.sort(compareByName);

  return [...favoriteCandidates, ...remainingCandidates];
}

/**
 * Returns deterministic related catalog entities for a seed: first by shared
 * anchor towns, then by same-region fallback, excluding non-card entity types,
 * with user favorites promoted by recency before alphabetical results.
 */
export function getRelated(
  current: Seed,
  allSeeds: readonly Seed[],
  favorites: readonly Favorite[],
): Seed[] {
  const anchorNames = getAnchorTownNames(current);
  const candidates = new Map<string, Seed>();
  const currentKey = seedKey(current);

  for (const candidate of allSeeds) {
    const key = seedKey(candidate);
    if (key === currentKey) continue;

    if (matchesAnchorCriteria(current, candidate, anchorNames)) {
      candidates.set(key, candidate);
    }
  }

  if (candidates.size < 4) {
    for (const candidate of allSeeds) {
      const key = seedKey(candidate);
      if (key === currentKey || candidates.has(key)) continue;

      if (candidate.region === current.region) {
        candidates.set(key, candidate);
      }
    }
  }

  const renderableCandidates = Array.from(candidates.values()).filter(
    candidate => !EXCLUDED_RELATED_TYPES.has(candidate.type),
  );

  if (renderableCandidates.length === 0) return [];

  return orderRelated(renderableCandidates, favorites).slice(0, MAX_RELATED);
}

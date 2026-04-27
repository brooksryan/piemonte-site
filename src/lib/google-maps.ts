import type { Seed } from '../data/schemas';

/**
 * Build a deterministic Google Maps URL for a Seed.
 *
 * Implements the three-step fallback algorithm from PRD-v1.2 Story 9
 * (apply in order; first match wins):
 *
 *   1. place_id form. If the seed carries a non-empty trimmed `placeId`,
 *      return `https://www.google.com/maps/place/?q=place_id:<placeId>`.
 *      The id is appended verbatim — Google's place_id values are URL-safe
 *      per spec, so no `encodeURIComponent` is applied.
 *
 *   2. lat/lon fallback. Otherwise, if the seed carries a `mapPin` whose
 *      `lat` and `lon` are both finite numbers (`Number.isFinite`), return
 *      `https://www.google.com/maps/?q=<lat>,<lon>` with both coordinates
 *      formatted via `toFixed(6)` and joined by a literal comma.
 *
 *   3. search fallback. Otherwise, return
 *      `https://www.google.com/maps/search/?api=1&query=<encoded>` where
 *      the query is `name + ' ' + town` when the seed carries a non-empty
 *      `town` field, and `name` alone when it does not. The query is
 *      passed through `encodeURIComponent` so spaces become `%20`.
 *
 * The function is pure and side-effect free; surfaces that need a Google
 * Maps anchor (Detail page, Plan-day card, Related strip card) call this
 * helper so the same entity always produces the same href (Story 9 #8).
 */
export function googleMapsHref(seed: Seed): string {
  // Step 1: place_id form. Narrow with `'placeId' in seed` so map, drive,
  // and region-narrative variants — which have no placeId field — short-circuit.
  if ('placeId' in seed && typeof seed.placeId === 'string' && seed.placeId.trim() !== '') {
    return `https://www.google.com/maps/place/?q=place_id:${seed.placeId}`;
  }

  // Step 2: lat/lon fallback. Only town and beach carry mapPin.
  if ('mapPin' in seed && seed.mapPin && Number.isFinite(seed.mapPin.lat) && Number.isFinite(seed.mapPin.lon)) {
    const lat = seed.mapPin.lat.toFixed(6);
    const lon = seed.mapPin.lon.toFixed(6);
    return `https://www.google.com/maps/?q=${lat},${lon}`;
  }

  // Step 3: search fallback. Use name + town when the seed carries a town
  // field (restaurant, winery, beach, cultural-site); otherwise name alone.
  const hasTown = 'town' in seed && typeof seed.town === 'string' && seed.town.trim() !== '';
  const query = hasTown ? `${seed.name} ${seed.town}` : seed.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

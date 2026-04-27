import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { googleMapsHref } from '../../src/lib/google-maps';
import type { Seed } from '../../src/data/schemas';

// Read seed JSON via Node fs rather than `import x from '...json'` because
// the ESM import-attribute syntax is not consistent across the loaders this
// suite runs under; the file paths are stable so a runtime read is fine.
const SEEDS_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/data/seeds',
);
const cervoSeed = JSON.parse(
  readFileSync(path.join(SEEDS_ROOT, 'beach/cervo.json'), 'utf8'),
) as { mapPin: { lat: number; lon: number } };
const hotelHelvetiaSeed = JSON.parse(
  readFileSync(path.join(SEEDS_ROOT, 'lodging/hotel-helvetia.json'), 'utf8'),
) as Record<string, unknown>;

function mapsLink(page: Page) {
  return page.getByRole('link', { name: 'Open in Google Maps' });
}

test.describe('Story 9 — Google Maps deep-links', () => {
  test('hotel-helvetia anchor uses placeId form and carries safe target/rel', async ({ page }) => {
    await page.goto('/entity/lodging/hotel-helvetia');
    const link = mapsLink(page);
    await expect(link).toBeVisible({ timeout: 10_000 });

    await expect(link).toHaveAttribute(
      'href',
      'https://www.google.com/maps/place/?q=place_id:ChIJ_3NmgA6X1BIRENl-zBP6mjA',
    );
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('barolo anchor uses six-decimal lat/lon form', async ({ page }) => {
    await page.goto('/entity/town/barolo');
    const link = mapsLink(page);
    await expect(link).toBeVisible({ timeout: 10_000 });

    // 44.6094 → "44.609400", 7.946 → "7.946000" via toFixed(6).
    await expect(link).toHaveAttribute('href', 'https://www.google.com/maps/?q=44.609400,7.946000');
  });

  test('cervo anchor matches lat/lon regex and equals the seed mapPin to six decimals', async ({ page }) => {
    expect(cervoSeed.mapPin, 'cervo seed should carry a mapPin').toBeTruthy();
    const lat = cervoSeed.mapPin.lat.toFixed(6);
    const lon = cervoSeed.mapPin.lon.toFixed(6);
    const expected = `https://www.google.com/maps/?q=${lat},${lon}`;

    await page.goto('/entity/beach/cervo');
    const link = mapsLink(page);
    await expect(link).toBeVisible({ timeout: 10_000 });

    const href = await link.getAttribute('href');
    expect(href).toBe(expected);
    expect(href).toMatch(/^https:\/\/www\.google\.com\/maps\/\?q=-?\d+\.\d{6},-?\d+\.\d{6}$/);
  });

  test('polpo-mario anchor uses search form with name + town encoded', async ({ page }) => {
    await page.goto('/entity/restaurant/polpo-mario');
    const link = mapsLink(page);
    await expect(link).toBeVisible({ timeout: 10_000 });

    const href = (await link.getAttribute('href')) ?? '';
    expect(href.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);

    const query = href.split('query=')[1] ?? '';
    expect(decodeURIComponent(query)).toBe('Polpo Mario Sestri Levante');
  });

  test('googleMapsHref helper handles empty placeId and non-finite mapPin', async () => {
    // Empty (whitespace-only) placeId on a lodging seed must NOT take the
    // place_id branch; Step 1 trims and rejects, so the fallback is the
    // search form keyed on `name` (lodging carries no `town`).
    const lodgingWithBlankPlaceId = {
      type: 'lodging',
      slug: 'x',
      name: 'X',
      region: 'langhe',
      sourceLocator: 's',
      base: 'alba-langhe',
      platform: 'direct',
      rateBand: 'E',
      why: 'w',
      placeId: '   ',
    } as unknown as Seed;
    expect(googleMapsHref(lodgingWithBlankPlaceId)).toBe(
      'https://www.google.com/maps/search/?api=1&query=X',
    );

    // Non-finite lat on a town seed must NOT take the lat/lon branch;
    // Number.isFinite(NaN) is false, so the fallback is the search form
    // on the town's `name` (TownSchema has no `town` field).
    const townWithNaNLat = {
      type: 'town',
      slug: 'y',
      name: 'Y',
      region: 'langhe',
      sourceLocator: 's',
      blurb: 'b',
      mapPin: { lat: NaN, lon: 7.0 },
    } as unknown as Seed;
    expect(googleMapsHref(townWithNaNLat)).toBe(
      'https://www.google.com/maps/search/?api=1&query=Y',
    );

    // Restaurant with neither placeId nor mapPin lands on Step 3 with the
    // name + town form; the space between them must be encoded as %20.
    const restaurantNoCoords = {
      type: 'restaurant',
      slug: 'z',
      name: 'Z',
      region: 'langhe',
      sourceLocator: 's',
      town: 'Alba',
      register: 'r',
      blurb: 'b',
    } as unknown as Seed;
    expect(googleMapsHref(restaurantNoCoords)).toBe(
      'https://www.google.com/maps/search/?api=1&query=Z%20Alba',
    );
  });

  test('rendered Detail anchor matches googleMapsHref(seed) — single source of truth', async ({ page }) => {
    // Story 9 #8: anywhere the same entity surfaces a Maps anchor, the href
    // must be byte-identical to googleMapsHref(seed). Detail is currently the
    // sole surface, so we verify the helper drives the rendered href.
    const expected = googleMapsHref(hotelHelvetiaSeed as unknown as Seed);

    await page.goto('/entity/lodging/hotel-helvetia');
    const link = mapsLink(page);
    await expect(link).toBeVisible({ timeout: 10_000 });

    await expect(link).toHaveAttribute('href', expected);
  });
});

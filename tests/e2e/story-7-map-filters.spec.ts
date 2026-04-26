import { test, expect, type Page, type Locator } from '@playwright/test';

const ALL_LABELS = ['Beach', 'Cultural Site', 'Lodging', 'Restaurant', 'Town', 'Winery'] as const;
const ALL_TYPE_SLUGS = ['beach', 'cultural-site', 'lodging', 'restaurant', 'town', 'winery'] as const;

async function legend(page: Page): Promise<Locator> {
  const region = page.locator('[aria-label="Map legend filter"]').first();
  await region.waitFor({ state: 'visible', timeout: 15_000 });
  return region;
}

function rowLocator(legendLocator: Locator, label: string): Locator {
  return legendLocator.getByRole('button', { name: new RegExp(`^${label}\\b`) }).first();
}

async function readMapFilters(page: Page): Promise<string[] | null> {
  return await page.evaluate(() => {
    const raw = window.localStorage.getItem('piemonte.mapFilters');
    return raw === null ? null : (JSON.parse(raw) as string[]);
  });
}

async function setMapFilters(page: Page, value: string[] | null) {
  await page.context().addInitScript((v: string[] | null) => {
    if (v === null) {
      window.localStorage.removeItem('piemonte.mapFilters');
    } else {
      window.localStorage.setItem('piemonte.mapFilters', JSON.stringify(v));
    }
  }, value);
}

async function markerCount(page: Page): Promise<number> {
  return await page.locator('.maplibregl-marker').count();
}

// MapLibre mounts markers asynchronously after the canvas paints. Wait until
// the marker count stabilizes (two consecutive reads agree) before any test
// captures a baseline count. The legend's row counts are derived from the
// candidate set and may include seeds without coordinates, so we cannot rely
// on legend-equals-marker-count as the readiness signal.
async function waitForMarkersToSettle(page: Page): Promise<number> {
  let last = -1;
  for (let i = 0; i < 30; i++) {
    const current = await markerCount(page);
    if (current > 0 && current === last) return current;
    last = current;
    await page.waitForTimeout(200);
  }
  return last;
}

async function rowCount(legendLocator: Locator, label: string): Promise<number> {
  const text = await rowLocator(legendLocator, label).innerText();
  const match = text.match(/(\d+)/);
  if (!match) throw new Error(`could not parse count from "${text}" for ${label}`);
  return parseInt(match[1], 10);
}

async function rowExists(legendLocator: Locator, label: string): Promise<boolean> {
  return (await legendLocator
    .getByRole('button', { name: new RegExp(`^${label}\\b`) })
    .count()) > 0;
}

async function sumVisibleCounts(legendLocator: Locator): Promise<number> {
  let sum = 0;
  for (const label of ALL_LABELS) {
    if (!(await rowExists(legendLocator, label))) continue;
    const aria = await rowLocator(legendLocator, label).getAttribute('aria-pressed');
    if (aria === 'true') sum += await rowCount(legendLocator, label);
  }
  return sum;
}

test.describe('Story 7 — legend-as-filter', () => {
  test.beforeEach(async ({ context }) => {
    // Each test starts from the implicit-all-visible default. Tests that need
    // a non-default starting state call setMapFilters before the first goto.
    await context.addInitScript(() => {
      try {
        window.localStorage.removeItem('piemonte.mapFilters');
      } catch {
        /* noop */
      }
    });
  });

  test('default state shows every type at full opacity with integer counts', async ({ page }) => {
    await page.goto('/maps');
    const lg = await legend(page);
    await expect(lg).toBeVisible();

    for (const label of ALL_LABELS) {
      const row = rowLocator(lg, label);
      await expect(row, `expected ${label} row aria-pressed=true on default load`).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      const text = await row.innerText();
      expect(text, `expected ${label} row text to match "<label> <count>"`).toMatch(
        new RegExp(`^${label}\\s+\\d+$`),
      );
    }

    expect(
      await readMapFilters(page),
      'piemonte.mapFilters should be null on first load before any toggle',
    ).toBeNull();
  });

  test('tap Lodging row hides lodging markers and updates piemonte.mapFilters', async ({ page }) => {
    await page.goto('/maps');
    const lg = await legend(page);
    await waitForMarkersToSettle(page);

    const beforeMarkers = await markerCount(page);
    const lodgingPinCount = await rowCount(lg, 'Lodging');
    const lodgingRow = rowLocator(lg, 'Lodging');

    await lodgingRow.click();

    await expect(lodgingRow).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => markerCount(page), { timeout: 5_000 }).toBe(beforeMarkers - lodgingPinCount);

    const filters = await readMapFilters(page);
    expect(filters, 'expected piemonte.mapFilters to be a JSON array after first toggle').not.toBeNull();
    expect(filters).not.toContain('lodging');
    expect(filters).toEqual(
      expect.arrayContaining(['beach', 'cultural-site', 'restaurant', 'town', 'winery']),
    );
  });

  test('switching active user does NOT mutate piemonte.mapFilters', async ({ page }) => {
    // PRD-v1.2 Story 7 declares the filter state global, not per-user. Avoid
    // writing a contradicting assertion by exercising the explicit non-symmetry.
    await setMapFilters(page, ['beach', 'cultural-site', 'restaurant', 'town', 'winery']);
    await page.goto('/maps');
    const lg = await legend(page);

    const lodgingRow = rowLocator(lg, 'Lodging');
    await expect(lodgingRow).toHaveAttribute('aria-pressed', 'false');

    const before = await readMapFilters(page);

    await page.getByRole('button', { name: 'switch active user' }).click();
    await page.getByRole('button', { name: /^Angela$/ }).click();
    await expect(page.getByRole('button', { name: 'switch active user' })).toHaveText(/^\s*A\s*$/);

    const after = await readMapFilters(page);
    expect(after, 'piemonte.mapFilters must not change when active user switches').toEqual(before);
    await expect(lodgingRow).toHaveAttribute('aria-pressed', 'false');
  });

  test('hidden type propagates from /maps to /countryside', async ({ page }) => {
    await setMapFilters(page, ['beach', 'cultural-site', 'restaurant', 'town', 'winery']);

    await page.goto('/maps');
    await legend(page);

    await page.goto('/countryside');
    const lg = await legend(page);
    await waitForMarkersToSettle(page);

    if (await rowExists(lg, 'Lodging')) {
      await expect(rowLocator(lg, 'Lodging')).toHaveAttribute('aria-pressed', 'false');
    }

    // PRD assertion 12: marker DOM count equals the sum of visible row counts.
    expect(await markerCount(page)).toBe(await sumVisibleCounts(lg));
  });

  test('reload preserves piemonte.mapFilters', async ({ page }) => {
    await setMapFilters(page, ['beach', 'town', 'winery']);
    await page.goto('/maps');
    const lg = await legend(page);

    for (const label of ['Lodging', 'Restaurant', 'Cultural Site']) {
      await expect(rowLocator(lg, label)).toHaveAttribute('aria-pressed', 'false');
    }

    await page.reload();
    const lg2 = await legend(page);
    for (const label of ['Lodging', 'Restaurant', 'Cultural Site']) {
      await expect(rowLocator(lg2, label)).toHaveAttribute('aria-pressed', 'false');
    }
    expect(await readMapFilters(page)).toEqual(['beach', 'town', 'winery']);
  });

  test('legend lays out horizontally without wrap and overflows on overflow', async ({ page }) => {
    await page.goto('/maps');
    const lg = await legend(page);

    const styles = await lg.evaluate((el) => {
      const cs = getComputedStyle(el as Element);
      return {
        overflowX: cs.overflowX,
        flexWrap: cs.flexWrap,
        whiteSpace: cs.whiteSpace,
      };
    });

    expect(
      ['auto', 'scroll'].includes(styles.overflowX),
      `expected legend overflow-x to be auto|scroll; got ${styles.overflowX}`,
    ).toBe(true);
    expect(
      styles.flexWrap === 'nowrap' || styles.whiteSpace === 'nowrap',
      `expected legend to be single-line (flex-wrap=nowrap or white-space=nowrap); got flex-wrap=${styles.flexWrap}, white-space=${styles.whiteSpace}`,
    ).toBe(true);
  });

  test('collapse toggle hides rows and re-expand restores them', async ({ page }) => {
    await page.goto('/maps');
    const lg = await legend(page);
    const lodgingRow = rowLocator(lg, 'Lodging');
    await expect(lodgingRow).toBeVisible();

    await page.getByRole('button', { name: 'Collapse legend' }).click();
    await expect(page.getByRole('button', { name: 'Expand legend' })).toBeVisible();
    expect(
      await lodgingRow.isVisible(),
      'expected Lodging row hidden after legend collapse',
    ).toBe(false);

    await page.getByRole('button', { name: 'Expand legend' }).click();
    await expect(lodgingRow).toBeVisible();
  });

  test('re-tapping a hidden row restores markers; total marker count equals sum of visible row counts', async ({
    page,
  }) => {
    await page.goto('/maps');
    const lg = await legend(page);
    await waitForMarkersToSettle(page);

    const lodgingRow = rowLocator(lg, 'Lodging');
    const beachRow = rowLocator(lg, 'Beach');

    await lodgingRow.click();
    await expect(lodgingRow).toHaveAttribute('aria-pressed', 'false');
    await beachRow.click();
    await expect(beachRow).toHaveAttribute('aria-pressed', 'false');

    expect(
      await markerCount(page),
      'PRD 12: marker count must equal sum of visible-type counts after two toggles',
    ).toBe(await sumVisibleCounts(lg));

    await lodgingRow.click();
    await expect(lodgingRow).toHaveAttribute('aria-pressed', 'true');

    const filters = await readMapFilters(page);
    expect(
      filters,
      'piemonte.mapFilters should re-include "lodging" after a re-tap',
    ).toContain('lodging');

    expect(
      await markerCount(page),
      'PRD 12: marker count must track the legend after lodging is re-tapped',
    ).toBe(await sumVisibleCounts(lg));
  });
});

// Touch the unused export so this constant is not flagged as dead by any linter
// while keeping it in scope for future assertions that need a slug-side check.
export const _internal = { ALL_TYPE_SLUGS };

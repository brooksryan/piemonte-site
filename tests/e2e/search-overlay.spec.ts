import { test, expect, type Page } from '@playwright/test';

async function openSearchOverlay(page: Page) {
  await page.goto('/maps');
  await page.getByRole('textbox', { name: 'search' }).click();
  const overlayInput = page.locator('input[placeholder="Search"]');
  await overlayInput.waitFor({ state: 'visible', timeout: 10_000 });
  return overlayInput;
}

async function searchFor(input: ReturnType<Page['locator']>, query: string) {
  await input.fill('');
  await input.fill(query);
}

test.describe('Bug 8 — search overlay multi-token matching', () => {
  test('multi-token query with gapped tokens surfaces Pinacoteca Giovanni e Marella Agnelli', async ({
    page,
  }) => {
    const input = await openSearchOverlay(page);
    await searchFor(input, 'pinacoteca agnelli');
    await expect(
      page.getByRole('button', { name: /Pinacoteca Giovanni e Marella Agnelli/ }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("multi-token query 'hotel helvetia' surfaces Hotel Helvetia", async ({ page }) => {
    const input = await openSearchOverlay(page);
    await searchFor(input, 'hotel helvetia');
    await expect(page.getByRole('button', { name: /^Hotel Helvetia/ })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("three-token query 'abbazia san fruttuoso' surfaces Abbazia di San Fruttuoso", async ({
    page,
  }) => {
    const input = await openSearchOverlay(page);
    await searchFor(input, 'abbazia san fruttuoso');
    await expect(page.getByRole('button', { name: /Abbazia di San Fruttuoso/ })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("single-token regression: 'barolo' still surfaces at least one Barolo entity", async ({
    page,
  }) => {
    const input = await openSearchOverlay(page);
    await searchFor(input, 'barolo');
    await expect(page.getByRole('button', { name: /Barolo/i }).first()).toBeVisible({
      timeout: 5_000,
    });
    expect(await page.getByRole('button', { name: /Barolo/i }).count()).toBeGreaterThanOrEqual(1);
  });

  test('whitespace-only query falls through to the unfiltered default state', async ({ page }) => {
    const input = await openSearchOverlay(page);
    await searchFor(input, '   ');
    await expect(page.getByText('[ placeholder ] no matches')).toHaveCount(0);
    expect(await page.getByRole('button').count()).toBeGreaterThan(50);
    await input.fill('');
    await expect(page.getByRole('button')).not.toHaveCount(0);
  });

  test('multi-space query collapses runs and still finds Hotel Helvetia', async ({ page }) => {
    const input = await openSearchOverlay(page);
    await searchFor(input, '  hotel   helvetia  ');
    await expect(page.getByRole('button', { name: /^Hotel Helvetia/ })).toBeVisible({
      timeout: 5_000,
    });
  });
});

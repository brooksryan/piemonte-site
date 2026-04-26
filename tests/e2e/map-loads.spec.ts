import { test, expect, type ConsoleMessage } from '@playwright/test';

const ROUTES = ['/', '/maps', '/countryside', '/coastal'] as const;

// Allow noise from MapLibre / WebGL warnings and from /api/* HTTP failures
// (the DB may be unset locally; the 503 surfaces as a "Failed to load resource"
// console error that is unrelated to map rendering). Fail on anything else.
function isAllowedNoise(text: string): boolean {
  const lowered = text.toLowerCase();
  if (lowered.includes('maplibre') || lowered.includes('webgl')) return true;
  if (lowered.includes('failed to load resource') && lowered.includes('503')) return true;
  if (lowered.includes('/api/')) return true;
  return false;
}

for (const route of ROUTES) {
  test(`map renders on ${route}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!isAllowedNoise(text)) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', (err) => {
      const text = err.message;
      if (!isAllowedNoise(text)) {
        pageErrors.push(text);
      }
    });

    await page.goto(route);

    const canvas = page.locator('canvas.maplibregl-canvas').first();
    const container = page.locator('.maplibregl-map').first();

    // Wait for either the canvas or the container to be visible.
    await Promise.race([
      canvas.waitFor({ state: 'visible', timeout: 15_000 }),
      container.waitFor({ state: 'visible', timeout: 15_000 }),
    ]);

    // Bug 1 gate: at iPhone-class viewport (390x844, set in playwright.config) the
    // map container has historically collapsed to clientHeight 0 due to a layout
    // race between the absolute-positioned ref div and MapLibre mount. Assert the
    // computed height is well above 100px so the regression is gated even when
    // the canvas itself happens to render visibly inside a collapsed parent.
    const containerHeightPx = await page.evaluate(() => {
      const el = document.querySelector(".maplibregl-map");
      if (!el) return 0;
      const cs = getComputedStyle(el as Element);
      return parseFloat(cs.height) || 0;
    });
    expect(
      containerHeightPx,
      `.maplibregl-map computed height was ${containerHeightPx}px on ${route}; expected > 100px`,
    ).toBeGreaterThan(100);

    await expect(page.locator('.maplibregl-ctrl-attrib').first()).toBeVisible();

    const markers = page.locator('.maplibregl-marker');
    await expect.poll(async () => markers.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(3);

    expect(
      consoleErrors,
      `Unexpected console errors on ${route}: ${consoleErrors.join(' | ')}`,
    ).toHaveLength(0);
    expect(
      pageErrors,
      `Unexpected page errors on ${route}: ${pageErrors.join(' | ')}`,
    ).toHaveLength(0);
  });
}

// Bug 4 gate: the Maps page must not surface a "Printable maps" section. The
// PRD's v1.2 follow-up removes that affordance because the live map renders
// every entity that the legacy SVGs covered. This assertion fails on the
// current build (which still ships the section) and is the regression gate
// once piemonte-dev removes it.
test('Maps page does not surface a printable-maps section', async ({ page }) => {
  await page.goto('/maps');
  await page.locator('canvas.maplibregl-canvas, .maplibregl-map').first().waitFor({
    state: 'visible',
    timeout: 15_000,
  });
  const printable = page.getByRole('heading', { name: /printable maps/i });
  await expect(printable).toHaveCount(0);
});

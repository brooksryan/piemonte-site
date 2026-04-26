import { test, expect, type Page } from '@playwright/test';

interface CardCase {
  name: string;
  route: '/countryside' | '/coastal';
  selector: string;
  snapshot: string;
}

const CASES: CardCase[] = [
  {
    name: 'town',
    route: '/countryside',
    selector: 'a[href^="/entity/town/"]',
    snapshot: 'countryside-town.png',
  },
  {
    name: 'lodging',
    route: '/countryside',
    selector: 'a[href^="/entity/lodging/"]',
    snapshot: 'countryside-lodging.png',
  },
  {
    name: 'restaurant',
    route: '/countryside',
    selector: 'a[href^="/entity/restaurant/"]',
    snapshot: 'countryside-restaurant.png',
  },
  {
    name: 'winery',
    route: '/countryside',
    selector: 'a[href^="/entity/winery/"]',
    snapshot: 'countryside-winery.png',
  },
  {
    name: 'cultural-site',
    route: '/countryside',
    selector: 'a[href^="/entity/cultural-site/"]',
    snapshot: 'countryside-cultural-site.png',
  },
  {
    name: 'beach',
    route: '/coastal',
    selector: 'a[href^="/entity/beach/"]',
    snapshot: 'coastal-beach.png',
  },
];

async function settle(page: Page) {
  // Give the map and lazy-loaded imagery a moment after navigation.
  await page.waitForLoadState('networkidle').catch(() => {
    /* networkidle can be flaky; ignore. */
  });
}

for (const c of CASES) {
  test(`card styling: ${c.name}`, async ({ page }) => {
    await page.goto(c.route);
    await settle(page);

    const first = page.locator(c.selector).first();
    await first.waitFor({ state: 'visible', timeout: 15_000 });
    await first.scrollIntoViewIfNeeded();

    await expect(first).toHaveScreenshot([c.snapshot], {
      maxDiffPixelRatio: 0.02,
    });
  });
}

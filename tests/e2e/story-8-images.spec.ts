import { test, expect, type Page, type Locator } from '@playwright/test';

// PRD-v1.2 Story 8 — beach hero images.
// The seven beach seeds whose JSON carries an `imageUrl` field. Asserting
// on this enumerated set keeps the spec stable; assertions also tolerate a
// future eighth seed by gating on `>= 7` rather than `=== 7`.
const BEACHES_WITH_IMAGES = [
  'alassio',
  'camogli',
  'cervo',
  'laigueglia',
  'san-fruttuoso',
  'spotorno',
  'varigotti-baia-dei-saraceni',
] as const;

async function imageHasNaturalWidth(locator: Locator): Promise<boolean> {
  return await locator.evaluate((el) => {
    if (!(el instanceof HTMLImageElement)) return false;
    return el.complete && el.naturalWidth > 0;
  });
}

function cardLocator(page: Page, slug: string): Locator {
  return page.locator(`a[href="/entity/beach/${slug}"]`).first();
}

test.describe('Story 8 — images render', () => {
  test('every imageUrl-bearing beach card on /coastal shows a real image with naturalWidth > 0', async ({ page }) => {
    await page.goto('/coastal');

    for (const slug of BEACHES_WITH_IMAGES) {
      const card = cardLocator(page, slug);
      await expect(card, `card for beach/${slug} should be visible on /coastal`).toBeVisible({
        timeout: 30_000,
      });

      // Cards below the fold use loading="lazy"; scroll the card into view
      // so the browser actually fetches the image before we poll naturalWidth.
      await card.scrollIntoViewIfNeeded();

      const img = card.locator('img').first();
      await expect(img, `card image for beach/${slug} should be visible`).toBeVisible({
        timeout: 30_000,
      });

      await expect
        .poll(async () => imageHasNaturalWidth(img), {
          timeout: 30_000,
          message: `card image for beach/${slug} did not load (naturalWidth === 0)`,
        })
        .toBe(true);
    }

    // PRD #2: none of the seven cards should fall back to the placeholder div.
    // Tailwind compiles `bg-liguria/10` to a class containing a forward slash;
    // the slash must be escaped in CSS selectors.
    for (const slug of BEACHES_WITH_IMAGES) {
      const card = cardLocator(page, slug);
      const placeholder = card.locator('div.bg-liguria\\/10');
      await expect(
        placeholder,
        `card for beach/${slug} should not render the placeholder block when imageUrl is set`,
      ).toHaveCount(0);
    }

    // Future-proof guard: at least seven cards across /coastal carry an <img>.
    const cardImageCount = await page.locator('a[href^="/entity/beach/"] img').count();
    expect(cardImageCount).toBeGreaterThanOrEqual(BEACHES_WITH_IMAGES.length);
  });

  for (const slug of BEACHES_WITH_IMAGES) {
    test(`Detail hero for beach/${slug} loads with status 2xx and Content-Type image/*`, async ({ page }) => {
      // Capture image responses before navigating so cache-cold loads are seen.
      const imageResponses: { url: string; status: number; contentType: string }[] = [];
      page.on('response', (resp) => {
        const ct = resp.headers()['content-type'] ?? '';
        if (ct.startsWith('image/')) {
          imageResponses.push({ url: resp.url(), status: resp.status(), contentType: ct });
        }
      });

      await page.goto(`/entity/beach/${slug}`);
      const hero = page.locator('img').first();
      await expect(hero).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => imageHasNaturalWidth(hero), {
          timeout: 30_000,
          message: `hero image on /entity/beach/${slug} did not load`,
        })
        .toBe(true);

      const heroSrc = await hero.getAttribute('src');
      expect(heroSrc, `hero <img> on beach/${slug} should carry a src`).toBeTruthy();
      const src = heroSrc as string;

      // Prefer the captured network response so the assertion exercises the
      // real upstream. Fall back to a fresh fetch when the browser served the
      // image from cache and emitted no response event.
      const matched = imageResponses.find((r) => r.url === src);
      if (matched) {
        expect(matched.status, `image response for ${src} status`).toBeGreaterThanOrEqual(200);
        expect(matched.status, `image response for ${src} status`).toBeLessThan(300);
        expect(matched.contentType.startsWith('image/'), `content-type for ${src}`).toBe(true);
      } else {
        const resp = await page.request.get(src);
        const status = resp.status();
        expect(status, `request to ${src} status`).toBeGreaterThanOrEqual(200);
        expect(status, `request to ${src} status`).toBeLessThan(300);
        const ct = resp.headers()['content-type'] ?? '';
        expect(ct.startsWith('image/'), `content-type for ${src} was ${ct}`).toBe(true);
      }
    });
  }

  test('card image and Detail-page hero share the same imageUrl per slug', async ({ page }) => {
    await page.goto('/coastal');

    const cardSrcBySlug = new Map<string, string>();
    for (const slug of BEACHES_WITH_IMAGES) {
      const card = cardLocator(page, slug);
      await expect(card).toBeVisible({ timeout: 30_000 });
      const src = await card.locator('img').first().getAttribute('src');
      expect(src, `card <img> src for beach/${slug}`).toBeTruthy();
      cardSrcBySlug.set(slug, src as string);
    }

    for (const slug of BEACHES_WITH_IMAGES) {
      await page.goto(`/entity/beach/${slug}`);
      const hero = page.locator('img').first();
      await expect(hero).toBeVisible({ timeout: 30_000 });
      const heroSrc = await hero.getAttribute('src');
      expect(heroSrc, `Detail hero src for beach/${slug}`).toBe(cardSrcBySlug.get(slug));
    }
  });

  test('imageCredit renders under the hero at text-xs text-muted', async ({ page }) => {
    // varigotti-baia-dei-saraceni and cervo both ship imageCredit in their seed JSON;
    // pick varigotti as the canonical case.
    await page.goto('/entity/beach/varigotti-baia-dei-saraceni');
    const hero = page.locator('img').first();
    await expect(hero).toBeVisible({ timeout: 30_000 });

    // Detail.tsx renders `<p class="text-xs text-muted mb-4">Photo: ...</p>`
    // immediately after the hero <img>, so the first such paragraph in the
    // beach branch is the credit line.
    const credit = page.locator('p.text-xs.text-muted').filter({ hasText: /^Photo:/ }).first();
    await expect(credit, 'expected imageCredit paragraph under the hero').toBeVisible({
      timeout: 10_000,
    });
  });
});

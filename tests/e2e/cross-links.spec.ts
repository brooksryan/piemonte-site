import { test, expect } from '@playwright/test';

async function relatedSection(page: import("@playwright/test").Page) {
  const header = page
    .locator('h1, h2, h3, h4, [role="heading"]')
    .filter({ hasText: /related|nearby/i })
    .first();
  await header.waitFor({ state: "visible", timeout: 10_000 });
  return header.locator('xpath=ancestor::*[self::section or self::div or self::nav][1]');
}

test.describe('cross-links', () => {
  test('town detail surfaces cross-links to related entities', async ({ page }) => {
    await page.goto('/entity/town/barolo');

    // Look for a "Related" or "Nearby" section header (case-insensitive).
    const sectionHeader = page
      .locator('h1, h2, h3, h4, [role="heading"]')
      .filter({ hasText: /related|nearby/i })
      .first();

    const headerCount = await sectionHeader.count();
    expect(
      headerCount,
      'Cross-links not implemented: expected a "Related" or "Nearby" section on /entity/town/barolo',
    ).toBeGreaterThan(0);

    // Find the nearest container that holds the section header and its content.
    // Scope the entity-link search to a sibling/parent container of the header.
    const sectionContainer = sectionHeader.locator(
      'xpath=ancestor::*[self::section or self::div or self::nav][1]',
    );

    const entityLink = sectionContainer.locator('a[href^="/entity/"]').first();
    await expect(
      entityLink,
      'Expected at least one /entity/ anchor inside the related/nearby section',
    ).toBeVisible();

    const targetHref = await entityLink.getAttribute('href');
    expect(targetHref).toMatch(/^\/entity\//);

    await entityLink.click();
    await page.waitForURL(/\/entity\//, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/entity\//);
  });

  test('Barolo neighbors include Vajra, Cantina Mascarello Bartolo, and WiMu / Castello Falletti', async ({ page }) => {
    await page.goto('/entity/town/barolo');
    const section = await relatedSection(page);

    for (const slug of ['gd-vajra', 'cantina-mascarello-bartolo', 'wimu-castello-falletti']) {
      await expect(
        section.locator(`a[href$="/${slug}"]`),
        `expected exactly one Related anchor ending with /${slug}`,
      ).toHaveCount(1, { timeout: 10_000 });
    }
  });

  test('Hotel Helvetia neighbors include at least one Sestri/Camogli restaurant or beach', async ({ page }) => {
    await page.goto('/entity/lodging/hotel-helvetia');
    const section = await relatedSection(page);
    const count = await section
      .locator('a[href^="/entity/restaurant/"], a[href^="/entity/beach/"]')
      .count();
    expect(
      count,
      'expected at least one /entity/restaurant/ or /entity/beach/ anchor in the Related strip',
    ).toBeGreaterThanOrEqual(1);
  });

  test('favorited neighbor leads the Related order', async ({ page, request }) => {
    const probe = await request
      .get('/api/favorites', { headers: { 'x-user-name': 'brooks' } })
      .catch(() => null);
    if (probe === null) {
      test.skip(true, 'favorites probe failed — skipping favorites-order spec');
      return;
    }
    test.skip(probe.status() === 503, 'DB unset locally — skipping favorites-order spec');
    if (probe.status() === 503) {
      return;
    }

    await page.context().addInitScript(() => {
      window.localStorage.setItem('piemonte.activeUser', 'brooks');
    });

    let id: string | number | null = null;

    try {
      const postResp = await request.post('/api/favorites', {
        headers: { 'x-user-name': 'brooks', 'content-type': 'application/json' },
        data: { entity_type: 'cultural-site', entity_slug: 'wimu-castello-falletti' },
      });

      expect(
        [200, 201],
        `expected POST /api/favorites to return 200 or 201, got ${postResp.status()}`,
      ).toContain(postResp.status());

      if (postResp.status() === 201) {
        const favorite = (await postResp.json()) as { id?: string | number };
        id = favorite.id ?? null;
      } else if (postResp.status() === 200) {
        const favoritesResp = await request.get('/api/favorites', {
          headers: { 'x-user-name': 'brooks' },
        });
        expect(favoritesResp.ok(), 'expected GET /api/favorites to succeed').toBeTruthy();
        const favorites = (await favoritesResp.json()) as Array<{
          id?: string | number;
          entity_type?: string;
          entity_slug?: string;
        }>;
        id =
          favorites.find(
            (favorite) =>
              favorite.entity_type === 'cultural-site' &&
              favorite.entity_slug === 'wimu-castello-falletti',
          )?.id ?? null;
      }

      expect(id, 'expected favorite id for cleanup').toBeTruthy();

      await page.goto('/entity/town/barolo');
      const section = await relatedSection(page);
      const firstEntityAnchor = section.locator('a[href^="/entity/"]').first();
      await expect(firstEntityAnchor).toHaveAttribute(
        'href',
        /\/entity\/cultural-site\/wimu-castello-falletti$/,
        { timeout: 15_000 },
      );
    } finally {
      if (id !== null) {
        await request.delete(`/api/favorites/${id}`, {
          headers: { 'x-user-name': 'brooks' },
        });
      }
    }
  });
});


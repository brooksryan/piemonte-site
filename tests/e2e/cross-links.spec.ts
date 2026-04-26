import { test, expect } from '@playwright/test';

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

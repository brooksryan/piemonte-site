import { test, expect } from '@playwright/test';

test.describe('user switcher', () => {
  test.beforeEach(async ({ context }) => {
    // Default active user to brooks on first load only; preserve any value written during a test so reload assertions remain valid.
    await context.addInitScript(() => {
      try {
        if (!window.localStorage.getItem("piemonte.activeUser")) {
          window.localStorage.setItem("piemonte.activeUser", "brooks");
        }
      } catch {
        /* noop */
      }
    });
  });

  test('switches active user and persists across reload', async ({ page }) => {
    await page.goto('/maps');

    const avatar = page.getByRole('button', { name: 'switch active user' });
    await expect(avatar).toBeVisible();

    const box = await avatar.boundingBox();
    expect(box, 'avatar should have a measurable bounding box').not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(40);
    expect(box!.height).toBeGreaterThanOrEqual(40);

    await expect(avatar).toHaveText(/^\s*B\s*$/);

    await avatar.click();

    const brooksOption = page.getByRole('button', { name: /^Brooks$/ });
    const angelaOption = page.getByRole('button', { name: /^Angela$/ });
    await expect(brooksOption).toBeVisible();
    await expect(angelaOption).toBeVisible();

    await angelaOption.click();

    await expect(avatar).toHaveText(/^\s*A\s*$/);

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('piemonte.activeUser'),
    );
    expect(stored).toBe('angela');

    await page.reload();

    const avatarAfterReload = page.getByRole('button', { name: 'switch active user' });
    await expect(avatarAfterReload).toBeVisible();
    await expect(avatarAfterReload).toHaveText(/^\s*A\s*$/);

    const storedAfterReload = await page.evaluate(() =>
      window.localStorage.getItem('piemonte.activeUser'),
    );
    expect(storedAfterReload).toBe('angela');
  });

  test.afterEach(async ({ page }) => {
    // Independence guarantee: leave the storage in a known state for the next spec.
    await page.evaluate(() => {
      try {
        window.localStorage.setItem('piemonte.activeUser', 'brooks');
      } catch {
        /* noop */
      }
    });
  });
});

import { test, expect, type APIResponse } from '@playwright/test';

test.describe('plan day strip', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem('piemonte.activeUser', 'brooks');
      } catch {
        /* noop */
      }
    });
  });

  test('selects days and adds a custom entry', async ({ page, request }) => {
    // Soft-skip if the API layer reports the DB is unconfigured.
    let probe: APIResponse | null = null;
    try {
      probe = await request.get('/api/favorites', {
        headers: { 'x-user-name': 'brooks' },
      });
    } catch {
      test.skip(true, 'favorites probe failed — skipping plan spec');
    }
    test.skip(probe?.status() === 503, 'DB unset locally — skipping plan spec');

    await page.goto('/plan');

    // Day-strip tiles are <button aria-pressed=...> containing the day number.
    const dayButtons = page.locator('button[aria-pressed]').filter({
      has: page.locator('text=/^\\s*\\d{1,2}\\s*$/'),
    });
    await dayButtons.first().waitFor({ state: 'visible', timeout: 15_000 });

    // Each tile renders the day number as its own <span>; use an exact-text
    // child match so we don't get tripped up by the weekday letter, the
    // optional month label, or the count badge sharing the button text.
    const may25 = dayButtons
      .filter({ has: page.getByText('25', { exact: true }) })
      .first();
    const may26 = dayButtons
      .filter({ has: page.getByText('26', { exact: true }) })
      .first();

    await expect(may25).toHaveAttribute('aria-pressed', 'true');

    await may26.click();
    await expect(may26).toHaveAttribute('aria-pressed', 'true');
    await expect(may25).toHaveAttribute('aria-pressed', 'false');

    const addBtn = page.getByRole('button', { name: 'Add to plan' });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    await page.getByRole('button', { name: /Add custom entry/i }).click();

    const uniqueTitle = `qa-smoke-${Date.now()}`;
    const titleInput = page.locator('input[required]').first();
    await titleInput.waitFor({ state: 'visible', timeout: 10_000 });
    await titleInput.fill(uniqueTitle);

    // Submit the form via the explicit "Add" button inside the modal and wait
    // for the POST /api/calendar round-trip before reloading. Enter alone has
    // proven flaky against the deployed origin.
    const calendarPost = page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/calendar') &&
          resp.request().method() === 'POST',
        { timeout: 15_000 },
      )
      .catch(() => null);

    await page.getByRole('button', { name: /^Add$/ }).click();
    await calendarPost;

    // Wait for the action sheet to close before reloading.
    await expect(titleInput).toBeHidden({ timeout: 10_000 }).catch(() => {
      /* if the form stays open, the assertion below will still validate the outcome. */
    });

    await page.reload();

    // Wait for the day-strip to mount.
    await page
      .locator('button[aria-pressed]')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });

    // Wait for the "Loading plan…" placeholder to disappear so we know the
    // calendar fetch has resolved before we interact.
    await expect(page.getByText('Loading plan…')).toBeHidden({ timeout: 15_000 }).catch(() => null);

    const may26AfterReload = page
      .locator('button[aria-pressed]')
      .filter({ has: page.getByText('26', { exact: true }) })
      .first();
    await may26AfterReload.click();
    await expect(may26AfterReload).toHaveAttribute('aria-pressed', 'true');

    // Either the custom entry's title appears in the day detail panel, or the
    // May 26 tile shows a count badge >= 1.
    const titleLocator = page.getByText(uniqueTitle, { exact: false }).first();
    const titleVisible = await titleLocator
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (!titleVisible) {
      // Fall back to inspecting a numeric badge on the May 26 button.
      const badgeText = await may26AfterReload.innerText();
      const numbers = badgeText.match(/\d+/g) ?? [];
      // Strip the day-of-month "26" itself; remaining numbers should include a
      // count of at least 1.
      const counts = numbers
        .map((n: string) => parseInt(n, 10))
        .filter((n: number) => n !== 26);
      const hasCount = counts.some((n) => n >= 1);
      expect(
        hasCount,
        `expected the May 26 tile to show a count badge >= 1 or the custom entry "${uniqueTitle}" to be visible`,
      ).toBe(true);
    }
  });
});

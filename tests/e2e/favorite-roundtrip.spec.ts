import { test, expect, type APIResponse } from '@playwright/test';

test.describe('favorite round-trip', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem('piemonte.activeUser', 'brooks');
      } catch {
        /* noop */
      }
    });
  });

  test('toggles favorite on a countryside card and persists across reload', async ({
    page,
    request,
  }) => {
    // Probe the favorites endpoint; if the DB is unconfigured, soft-skip.
    let probe: APIResponse | null = null;
    try {
      probe = await request.get('/api/favorites', {
        headers: { 'x-user-name': 'brooks' },
      });
    } catch {
      test.skip(true, 'favorites probe failed — skipping round-trip');
    }
    test.skip(
      probe?.status() === 503,
      'DB unset locally — skipping fav round-trip',
    );

    await page.goto('/countryside');

    // Wait for any entity card to render.
    await page
      .locator('a[href^="/entity/"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });

    const heart = page.getByRole('button', { name: 'Add to favorites' }).first();
    await heart.waitFor({ state: 'visible', timeout: 15_000 });

    // EntityCard renders the heart button as a sibling of the /entity/ <a>,
    // both wrapped in a `relative` parent div. Walk up to that wrapper, then
    // grab the sibling anchor's href so we can re-find the same card after a
    // reload.
    const cardWrapper = heart.locator('xpath=..');
    const href = await cardWrapper
      .locator('a[href^="/entity/"]')
      .first()
      .getAttribute('href');
    expect(href, 'expected a sibling /entity/ anchor next to the heart button').toBeTruthy();

    const postPromise = page.waitForResponse(
      (resp) =>
        resp.url().endsWith('/api/favorites') &&
        resp.request().method() === 'POST',
      { timeout: 10_000 },
    );

    await heart.click();

    // Race: either the POST resolves with 201, or the aria-label flips.
    const flip = page
      .getByRole('button', { name: 'Remove from favorites' })
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 });

    const winner = await Promise.race([
      postPromise.then((r) => ({ kind: 'post' as const, response: r })),
      flip.then(() => ({ kind: 'flip' as const })),
    ]);

    if (winner.kind === 'post') {
      expect(winner.response.status()).toBe(201);
    }

    // Make sure both have settled before we reload.
    await postPromise.catch(() => null);
    await page.getByRole('button', { name: 'Remove from favorites' }).first().waitFor({
      state: 'visible',
      timeout: 10_000,
    });

    await page.reload();

    // The card we touched should now be in the "Remove" state.
    const sameCardAnchor = page.locator(`a[href="${href}"]`).first();
    await sameCardAnchor.waitFor({ state: 'visible', timeout: 15_000 });
    const cardScope = sameCardAnchor.locator(
      'xpath=ancestor-or-self::*[self::article or self::li or self::div][1]',
    );
    const removeBtn = cardScope
      .getByRole('button', { name: 'Remove from favorites' })
      .first();
    await expect(removeBtn).toBeVisible();

    // Now toggle off and assert the DELETE round-trip.
    const deletePromise = page.waitForResponse(
      (resp) =>
        /\/api\/favorites\/[^/?#]+/.test(resp.url()) &&
        resp.request().method() === 'DELETE',
      { timeout: 10_000 },
    );

    await removeBtn.click();

    const deleteResp = await deletePromise;
    expect(deleteResp.status()).toBe(204);

    await expect(
      cardScope.getByRole('button', { name: 'Add to favorites' }).first(),
    ).toBeVisible();
  });
});

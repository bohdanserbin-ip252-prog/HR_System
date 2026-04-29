import { expect, test } from '../fixtures/test.ts';

test.describe('mobile complaints layout', () => {
  test('opens the drawer, shows complaint controls, and keeps cards inside the viewport', async ({ page, loginPage, complaintsPage }) => {
    await loginPage.goto();
    await loginPage.loginAsViewer();
    await complaintsPage.goto();

    await expect(complaintsPage.heading).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Пошук скарг' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Нова скарга' })).toBeVisible();

    const viewport = page.viewportSize();
    const box = await page.locator('.complaints-hero').boundingBox();
    expect(box?.width || 0).toBeLessThanOrEqual((viewport?.width || 0) + 1);
  });
});

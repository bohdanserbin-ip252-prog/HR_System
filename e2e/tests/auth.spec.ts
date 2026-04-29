import { expect, test } from '../fixtures/test.ts';

test.describe('authentication shell', () => {
  test('logs in as admin and logs out', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAsAdmin();

    await loginPage.openNavigationIfNeeded();
    await expect(page.getByRole('button', { name: 'Скарги' })).toBeVisible();
    await loginPage.logout();
  });
});

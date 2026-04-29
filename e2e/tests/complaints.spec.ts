import { expect, test } from '../fixtures/test.ts';

test.describe('employee complaints', () => {
  test('viewer can submit a complaint without moderation controls', async ({ page, loginPage, complaintsPage }) => {
    const title = `E2E viewer complaint ${Date.now()}`;

    await loginPage.goto();
    await loginPage.loginAsViewer();
    await complaintsPage.goto();
    await complaintsPage.createComplaint({
      title,
      description: 'Скарга створена звичайним користувачем у Playwright.'
    });

    await expect(complaintsPage.card(title)).toContainText('Відкрита');
    await expect(complaintsPage.card(title).getByRole('button', { name: 'Редагувати скаргу' })).toHaveCount(0);
    await expect(complaintsPage.card(title).getByRole('button', { name: 'Видалити скаргу' })).toHaveCount(0);
  });

  test('admin can moderate and delete a complaint', async ({ page, loginPage, complaintsPage }) => {
    const title = `E2E admin complaint ${Date.now()}`;

    await loginPage.goto();
    await loginPage.loginAsAdmin();
    await complaintsPage.goto();
    await complaintsPage.createComplaint({
      title,
      description: 'Скарга створена адміністратором у Playwright.'
    });

    await complaintsPage.editComplaint(title);
    await page.getByLabel('Статус *').selectOption('in_review');
    await page.getByLabel('Нотатки рішення').fill('Перевірка триває');
    await complaintsPage.saveForm();

    await expect(complaintsPage.card(title)).toContainText('В роботі');
    await expect(complaintsPage.card(title)).toContainText('Перевірка триває');

    await complaintsPage.deleteComplaint(title);
  });
});

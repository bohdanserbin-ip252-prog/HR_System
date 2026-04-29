import { expect, test } from '../fixtures/test.ts';

const MODULES = [
  ['Документи', 'HR Документи'],
  ['Payroll', 'Payroll Engine'],
  ['Training', 'Training / LMS'],
  ['Графіки', 'Shift Scheduling'],
  ['Performance', 'Performance Review'],
  ['Відсутності', 'Відсутності та відпустки'],
  ['Employee 360', 'Employee 360'],
  ['Workflows', 'Workflow Builder'],
  ['Import', 'Data Import'],
  ['Reports', 'Reports Center'],
  ['Roles', 'Roles & Permissions'],
  ['Мій портал', 'Мій портал'],
  ['Оргструктура', 'Оргструктура'],
  ['Audit', 'Audit & Compliance']
];

test.describe('expanded HR modules', () => {
  test('admin can navigate through the new workspace pages', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAsAdmin();

    for (const [navLabel, heading] of MODULES) {
      await loginPage.openNavigationIfNeeded();
      await page.getByRole('button', { name: navLabel, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });
});

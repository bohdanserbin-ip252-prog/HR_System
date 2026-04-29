import { test as base, expect } from '@playwright/test';
import { ComplaintsPage } from '../pages/ComplaintsPage.ts';
import { LoginPage } from '../pages/LoginPage.ts';

export const test = base.extend({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  complaintsPage: async ({ page }, use) => {
    await use(new ComplaintsPage(page));
  }
});

export { expect };

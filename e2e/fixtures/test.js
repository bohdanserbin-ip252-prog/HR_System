import { test as base, expect } from '@playwright/test';
import { ComplaintsPage } from '../pages/ComplaintsPage.js';
import { LoginPage } from '../pages/LoginPage.js';

export const test = base.extend({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  complaintsPage: async ({ page }, use) => {
    await use(new ComplaintsPage(page));
  }
});

export { expect };

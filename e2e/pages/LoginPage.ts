import { expect } from '@playwright/test';

export class LoginPage {
  constructor(page) {
    this.page = page;
    this.usernameInput = page.getByLabel('Логін');
    this.passwordInput = page.getByLabel('Пароль');
    this.submitButton = page.getByRole('button', { name: /Увійти/ });
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.usernameInput).toBeVisible();
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await expect(this.page.locator('#appContainer')).toBeVisible();
  }

  async loginAsAdmin() {
    await this.login('admin', 'admin123');
  }

  async loginAsViewer() {
    await this.login('viewer', 'viewer123');
  }

  async openNavigationIfNeeded() {
    const logoutButton = this.page.getByRole('button', { name: /Вийти/ });
    if (await logoutButton.isVisible().catch(() => false)) return;

    await this.page.getByRole('button', { name: /Відкрити навігацію/ }).click();
    await expect(logoutButton).toBeVisible();
  }

  async logout() {
    await this.openNavigationIfNeeded();
    await this.page.getByRole('button', { name: /Вийти/ }).click();
    await expect(this.usernameInput).toBeVisible();
  }
}

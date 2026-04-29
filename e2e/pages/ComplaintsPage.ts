import { expect } from '@playwright/test';

export class ComplaintsPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Скарги на працівників' });
    this.createButton = page.getByRole('button', { name: 'Нова скарга' });
  }

  async goto() {
    const visibleNavItem = this.page.getByRole('button', { name: 'Скарги' });

    if (!(await visibleNavItem.isVisible().catch(() => false))) {
      await this.page.getByRole('button', { name: /Відкрити навігацію/ }).click();
    }

    await this.page.getByRole('button', { name: 'Скарги' }).click();
    await expect(this.heading).toBeVisible();
  }

  async openCreateForm() {
    await this.createButton.click();
    await expect(this.page.getByRole('dialog', { name: 'Нова скарга' })).toBeVisible();
  }

  async fillRequiredComplaintFields({ title, description, severity = 'high' }) {
    await this.page.getByLabel('Працівник *').selectOption({ index: 1 });
    await this.page.getByLabel('Дата скарги *').fill('2026-04-21');
    await this.page.getByLabel('Серйозність *').selectOption(severity);
    await this.page.getByLabel('Заявник').fill('Playwright');
    await this.page.getByLabel('Тема *').fill(title);
    await this.page.getByLabel('Опис *').fill(description);
  }

  async saveForm() {
    await this.page.getByRole('button', { name: 'Зберегти' }).click();
  }

  async createComplaint(complaint) {
    await this.openCreateForm();
    await this.fillRequiredComplaintFields(complaint);
    await this.saveForm();
    await expect(this.page.getByText(complaint.title)).toBeVisible();
  }

  card(title) {
    return this.page.locator('.complaint-card').filter({ hasText: title });
  }

  async editComplaint(title) {
    const card = this.card(title);
    await card.getByRole('button', { name: 'Редагувати скаргу' }).click();
    await expect(this.page.getByRole('dialog', { name: 'Редагувати скаргу' })).toBeVisible();
  }

  async deleteComplaint(title) {
    const card = this.card(title);
    await card.getByRole('button', { name: 'Видалити скаргу' }).click();
    const dialog = this.page.getByRole('dialog', { name: 'Підтвердження' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Видалити', exact: true }).click();
    await expect(card).toHaveCount(0);
  }
}

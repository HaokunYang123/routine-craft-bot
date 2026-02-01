import { type Locator, type Page } from '@playwright/test';

/**
 * Page Object for the Coach Dashboard (/dashboard)
 *
 * Encapsulates coach-specific interactions:
 * - Viewing and managing groups
 * - Creating new groups
 * - Navigating to group details
 */
export class CoachDashboardPage {
  readonly page: Page;
  readonly createGroupButton: Locator;
  readonly groupNameInput: Locator;
  readonly groupsList: Locator;
  readonly saveButton: Locator;
  readonly groupCards: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use accessible selectors - role, label, testid
    this.createGroupButton = page
      .getByRole('button', { name: /create.*group|add.*group|new.*group/i })
      .or(page.locator('[data-testid="create-group-button"]'));
    this.groupNameInput = page
      .getByLabel(/group name|class name/i)
      .or(page.locator('[data-testid="group-name-input"]'));
    this.groupsList = page
      .locator('[data-testid="groups-list"]')
      .or(page.getByRole('list').filter({ has: page.getByRole('link') }));
    this.saveButton = page
      .getByRole('button', { name: /save|create|submit/i })
      .or(page.locator('[data-testid="save-button"]'));
    this.groupCards = page.locator('[data-testid="group-card"]').or(page.locator('.group-card'));
  }

  /**
   * Navigate to the coach dashboard
   */
  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Create a new group with the given name
   */
  async createGroup(name: string) {
    await this.createGroupButton.click();
    await this.groupNameInput.fill(name);
    await this.saveButton.click();
  }

  /**
   * Open a group by its name
   */
  async openGroup(name: string) {
    await this.page.getByRole('link', { name: new RegExp(name, 'i') }).click();
  }

  /**
   * Check if a group with the given name is visible
   */
  async isGroupVisible(name: string): Promise<boolean> {
    const group = this.page.getByText(new RegExp(name, 'i'));
    return group.isVisible();
  }

  /**
   * Get the count of visible groups
   */
  async getGroupCount(): Promise<number> {
    // Wait for any group cards to appear
    const cards = this.groupCards;
    const count = await cards.count();
    return count;
  }
}

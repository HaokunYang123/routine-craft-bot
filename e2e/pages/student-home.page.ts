import { type Locator, type Page } from '@playwright/test';

/**
 * Page Object for the Student Home page (/app)
 *
 * Encapsulates student-specific interactions:
 * - Viewing assigned tasks
 * - Completing tasks
 * - Viewing task status
 */
export class StudentHomePage {
  readonly page: Page;
  readonly taskList: Locator;
  readonly completedBadge: Locator;
  readonly overdueSection: Locator;
  readonly todaySection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.taskList = page
      .locator('[data-testid="task-list"]')
      .or(page.getByRole('list'));
    this.completedBadge = page.getByText(/completed|done/i);
    this.overdueSection = page
      .locator('[data-testid="overdue-section"]')
      .or(page.getByText(/overdue/i).locator('..'));
    this.todaySection = page
      .locator('[data-testid="today-section"]')
      .or(page.getByText(/today/i).locator('..'));
  }

  /**
   * Navigate to the student home page
   */
  async goto() {
    await this.page.goto('/app');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Complete a task by clicking its checkbox
   */
  async completeTask(taskName: string) {
    const taskItem = this.page.getByRole('listitem').filter({ hasText: taskName });
    const checkbox = taskItem
      .getByRole('checkbox')
      .or(taskItem.locator('input[type="checkbox"]'));
    await checkbox.check();
  }

  /**
   * Get a task locator by its name
   */
  getTaskByName(name: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: name });
  }

  /**
   * Check if a task with the given name is visible
   */
  async isTaskVisible(taskName: string): Promise<boolean> {
    const task = this.page.getByText(new RegExp(taskName, 'i'));
    return task.isVisible();
  }

  /**
   * Check if a task is completed (has completed styling or badge)
   */
  async isTaskCompleted(taskName: string): Promise<boolean> {
    const taskItem = this.getTaskByName(taskName);
    const checkbox = taskItem
      .getByRole('checkbox')
      .or(taskItem.locator('input[type="checkbox"]'));
    return checkbox.isChecked();
  }

  /**
   * Get the count of visible tasks
   */
  async getTaskCount(): Promise<number> {
    const tasks = this.taskList.locator('[data-testid="task-item"]').or(
      this.page.getByRole('listitem')
    );
    return tasks.count();
  }
}

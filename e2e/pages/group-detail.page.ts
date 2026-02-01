import { type Locator, type Page } from '@playwright/test';

/**
 * Page Object for the Group Detail page (/dashboard/groups/:id)
 *
 * Encapsulates group management interactions:
 * - Viewing group members
 * - Assigning tasks to students
 * - Managing group settings
 */
export class GroupDetailPage {
  readonly page: Page;
  readonly addTaskButton: Locator;
  readonly taskNameInput: Locator;
  readonly saveTaskButton: Locator;
  readonly taskList: Locator;
  readonly studentsList: Locator;
  readonly groupName: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addTaskButton = page
      .getByRole('button', { name: /add.*task|new.*task|assign.*task/i })
      .or(page.locator('[data-testid="add-task-button"]'));
    this.taskNameInput = page
      .getByLabel(/task.*name|title/i)
      .or(page.locator('[data-testid="task-name-input"]'));
    this.saveTaskButton = page
      .getByRole('button', { name: /save|create|assign/i })
      .or(page.locator('[data-testid="save-task-button"]'));
    this.taskList = page
      .locator('[data-testid="task-list"]')
      .or(page.getByRole('list'));
    this.studentsList = page
      .locator('[data-testid="students-list"]')
      .or(page.getByRole('list').filter({ hasText: /student/i }));
    this.groupName = page
      .locator('[data-testid="group-name"]')
      .or(page.getByRole('heading').first());
  }

  /**
   * Navigate to a specific group detail page
   */
  async goto(groupId: string) {
    await this.page.goto(`/dashboard/groups/${groupId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Assign a task with the given name
   */
  async assignTask(taskName: string) {
    await this.addTaskButton.click();
    await this.taskNameInput.fill(taskName);
    await this.saveTaskButton.click();
  }

  /**
   * Check if a task with the given name is visible
   */
  async isTaskVisible(taskName: string): Promise<boolean> {
    const task = this.page.getByText(new RegExp(taskName, 'i'));
    return task.isVisible();
  }

  /**
   * Get the current group name from the page
   */
  async getGroupName(): Promise<string> {
    return (await this.groupName.textContent()) ?? '';
  }

  /**
   * Get the count of students in the group
   */
  async getStudentCount(): Promise<number> {
    const students = this.studentsList.locator('[data-testid="student-item"]');
    return students.count();
  }
}

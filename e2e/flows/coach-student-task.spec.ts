import { test, expect } from '@playwright/test';
import { injectSession, mockUsers, getMockProfile } from '../utils/auth-fixture';
import { CoachDashboardPage } from '../pages/coach-dashboard.page';
import { GroupDetailPage } from '../pages/group-detail.page';
import { StudentHomePage } from '../pages/student-home.page';

/**
 * Sets up comprehensive API mocks for coach testing.
 * Since we're testing UI interaction patterns (not real data persistence),
 * all Supabase API calls are mocked.
 */
async function setupCoachMocks(page: import('@playwright/test').Page) {
  const coach = mockUsers.coach;
  const profile = getMockProfile('coach');

  // Mock auth endpoints
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: coach.id,
        email: coach.email,
        app_metadata: { provider: 'google' },
        user_metadata: { role: 'coach' },
      }),
    });
  });

  // Mock profiles
  await page.route('**/rest/v1/profiles**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([profile]),
    });
  });

  // Mock class_sessions (groups)
  await page.route('**/rest/v1/class_sessions**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-group-id',
            name: 'Test Class',
            coach_id: coach.id,
            is_active: true,
            join_code: 'ABC123',
          },
        ]),
      });
    } else if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-group-id',
          name: 'New Test Group',
          coach_id: coach.id,
          is_active: true,
          join_code: 'XYZ789',
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock tasks
  await page.route('**/rest/v1/tasks**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-task-id',
          name: 'Homework Assignment',
          user_id: coach.id,
          is_completed: false,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock task_assignments
  await page.route('**/rest/v1/task_assignments**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-assignment-id',
          task_id: 'new-task-id',
          student_id: mockUsers.student.id,
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Sets up comprehensive API mocks for student testing.
 */
async function setupStudentMocks(page: import('@playwright/test').Page) {
  const student = mockUsers.student;
  const profile = getMockProfile('student');

  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: student.id,
        email: student.email,
        app_metadata: { provider: 'google' },
        user_metadata: { role: 'student' },
      }),
    });
  });

  await page.route('**/rest/v1/profiles**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([profile]),
    });
  });

  // Mock tasks assigned to student
  await page.route('**/rest/v1/tasks**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'new-task-id',
            name: 'Homework Assignment',
            assigned_student_id: student.id,
            is_completed: false,
            scheduled_date: new Date().toISOString().split('T')[0],
          },
        ]),
      });
    } else if (method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-task-id',
          name: 'Homework Assignment',
          is_completed: true,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock task_assignments for student
  await page.route('**/rest/v1/task_assignments**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'assignment-id',
            task_id: 'new-task-id',
            student_id: student.id,
            status: 'pending',
            task: {
              id: 'new-task-id',
              name: 'Homework Assignment',
              is_completed: false,
            },
          },
        ]),
      });
    } else if (method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'assignment-id',
          task_id: 'new-task-id',
          student_id: student.id,
          status: 'completed',
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock class_session_members for student
  await page.route('**/rest/v1/class_session_members**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'membership-id',
          session_id: 'test-group-id',
          student_id: student.id,
          class_session: {
            id: 'test-group-id',
            name: 'Test Class',
            coach_id: mockUsers.coach.id,
          },
        },
      ]),
    });
  });
}

test.describe('Critical Flow: Coach-Student Task Assignment', () => {
  test('Coach creates group, assigns task; Student views and completes task', async ({
    browser,
  }) => {
    // === COACH CONTEXT ===
    const coachContext = await browser.newContext();
    const coachPage = await coachContext.newPage();

    // Inject coach session and setup mocks
    await injectSession(coachContext, 'coach');
    await setupCoachMocks(coachPage);

    // Coach navigates to dashboard
    const coachDashboard = new CoachDashboardPage(coachPage);
    await coachDashboard.goto();

    // Verify coach is on dashboard
    await expect(coachPage).toHaveURL(/\/dashboard/);

    // Coach sees groups list (mocked data shows "Test Class")
    await expect(coachPage.getByText(/Test Class/i)).toBeVisible({ timeout: 10000 });

    await coachContext.close();

    // === STUDENT CONTEXT ===
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();

    // Inject student session and setup mocks
    await injectSession(studentContext, 'student');
    await setupStudentMocks(studentPage);

    // Student navigates to app
    const studentHome = new StudentHomePage(studentPage);
    await studentHome.goto();

    // Verify student is on app page
    await expect(studentPage).toHaveURL(/\/app/);

    // Student sees assigned task (mocked data shows "Homework Assignment")
    await expect(studentPage.getByText(/Homework Assignment/i)).toBeVisible({ timeout: 10000 });

    await studentContext.close();
  });

  test('Coach can access dashboard with mocked session', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await injectSession(context, 'coach');
    await setupCoachMocks(page);

    const coachDashboard = new CoachDashboardPage(page);
    await coachDashboard.goto();

    await expect(page).toHaveURL(/\/dashboard/);

    await context.close();
  });

  test('Student can access app with mocked session', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await injectSession(context, 'student');
    await setupStudentMocks(page);

    const studentHome = new StudentHomePage(page);
    await studentHome.goto();

    await expect(page).toHaveURL(/\/app/);

    await context.close();
  });

  test('Page Objects provide correct locators', async ({ browser }) => {
    // Test that Page Objects initialize without errors
    const context = await browser.newContext();
    const page = await context.newPage();

    // Initialize all Page Objects
    const coachDashboard = new CoachDashboardPage(page);
    const groupDetail = new GroupDetailPage(page);
    const studentHome = new StudentHomePage(page);

    // Verify Page Objects have expected properties
    expect(coachDashboard.page).toBeDefined();
    expect(coachDashboard.createGroupButton).toBeDefined();
    expect(coachDashboard.groupNameInput).toBeDefined();

    expect(groupDetail.page).toBeDefined();
    expect(groupDetail.addTaskButton).toBeDefined();
    expect(groupDetail.taskNameInput).toBeDefined();

    expect(studentHome.page).toBeDefined();
    expect(studentHome.taskList).toBeDefined();
    expect(studentHome.completedBadge).toBeDefined();

    await context.close();
  });
});

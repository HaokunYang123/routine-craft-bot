/**
 * Mock data factories for testing.
 * Generate realistic test data matching database schema.
 */

// Counter for generating unique IDs
let idCounter = 0;

/**
 * Generates a unique UUID-like string for testing.
 */
export function createId(prefix = 'test'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

/**
 * Resets the ID counter (call in beforeEach if needed).
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Creates a mock user object.
 */
export function createMockUser(overrides?: {
  id?: string;
  email?: string;
  role?: 'teacher' | 'student';
  displayName?: string;
}) {
  return {
    id: overrides?.id ?? createId('user'),
    email: overrides?.email ?? `user-${idCounter}@example.com`,
    role: overrides?.role ?? 'teacher',
    display_name: overrides?.displayName ?? `Test User ${idCounter}`,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Creates a mock group (class) object.
 */
export function createMockGroup(overrides?: {
  id?: string;
  name?: string;
  teacherId?: string;
  code?: string;
}) {
  const id = overrides?.id ?? createId('group');
  return {
    id,
    name: overrides?.name ?? `Test Group ${idCounter}`,
    teacher_id: overrides?.teacherId ?? createId('teacher'),
    code: overrides?.code ?? `ABC${idCounter}`,
    description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Creates a mock assignment object.
 */
export function createMockAssignment(overrides?: {
  id?: string;
  title?: string;
  description?: string;
  groupId?: string;
  teacherId?: string;
  dueDate?: string;
  scheduleType?: 'once' | 'daily' | 'weekly' | 'custom';
  status?: 'active' | 'completed' | 'archived';
}) {
  return {
    id: overrides?.id ?? createId('assignment'),
    title: overrides?.title ?? `Test Assignment ${idCounter}`,
    description: overrides?.description ?? 'Test assignment description',
    group_id: overrides?.groupId ?? createId('group'),
    teacher_id: overrides?.teacherId ?? createId('teacher'),
    due_date: overrides?.dueDate ?? new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    schedule_type: overrides?.scheduleType ?? 'once',
    status: overrides?.status ?? 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Creates a mock task completion record.
 */
export function createMockTaskCompletion(overrides?: {
  id?: string;
  assignmentId?: string;
  studentId?: string;
  completed?: boolean;
  completedAt?: string | null;
}) {
  return {
    id: overrides?.id ?? createId('completion'),
    assignment_id: overrides?.assignmentId ?? createId('assignment'),
    student_id: overrides?.studentId ?? createId('student'),
    completed: overrides?.completed ?? false,
    completed_at: overrides?.completedAt ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Creates a mock template object.
 */
export function createMockTemplate(overrides?: {
  id?: string;
  name?: string;
  teacherId?: string;
  tasks?: Array<{ title: string; description?: string }>;
}) {
  return {
    id: overrides?.id ?? createId('template'),
    name: overrides?.name ?? `Test Template ${idCounter}`,
    teacher_id: overrides?.teacherId ?? createId('teacher'),
    tasks: overrides?.tasks ?? [
      { title: 'Task 1', description: 'First task' },
      { title: 'Task 2', description: 'Second task' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Realtime Channel Naming Constants
 *
 * Provides consistent channel names for Supabase Realtime subscriptions.
 * Each channel is scoped to a user ID to ensure proper isolation.
 *
 * Coach channels: See updates from all students in their groups
 * Student channels: Only see updates for their own assignments
 */
export const REALTIME_CHANNELS = {
  // Coach channels - see all student updates in their groups
  COACH_TASK_UPDATES: (userId: string) => `coach-tasks-${userId}`,
  COACH_CHECKINS: (userId: string) => `coach-checkins-${userId}`,

  // Student channels - only see own assignments
  STUDENT_ASSIGNMENTS: (userId: string) => `student-assignments-${userId}`,
  STUDENT_TASKS: (userId: string) => `student-tasks-${userId}`,
} as const;

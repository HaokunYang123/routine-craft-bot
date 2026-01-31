/**
 * Hook for categorizing tasks into Today, Overdue, and Yesterday Completed sections
 *
 * Per CONTEXT.md decisions:
 * - Today: scheduled_date === today, any status
 * - Overdue: scheduled_date < today, status === 'pending'
 * - Yesterday Completed: scheduled_date === yesterday, status === 'completed'
 *
 * Sorting rules:
 * - Today: by created_at ascending (oldest first, preserve creation order)
 * - Overdue: by scheduled_date descending (newest-first, yesterday's at top)
 * - Yesterday Completed: by created_at ascending (preserve order)
 *
 * NOTE: Completed tasks stay in original order position in today section (don't sink to bottom)
 */
import { useMemo } from 'react';
import { useTimezone } from './useTimezone';
import type { TaskInstance } from './useAssignments';

/**
 * Categorized task sections for display
 */
export interface CategorizedTasks {
  /** Tasks scheduled for today (any status) */
  today: TaskInstance[];
  /** Pending tasks from before today */
  overdue: TaskInstance[];
  /** Completed tasks from yesterday only */
  yesterdayCompleted: TaskInstance[];
}

/**
 * Categorizes tasks into Today, Overdue, and Yesterday Completed sections
 *
 * @param tasks - Array of task instances to categorize
 * @returns CategorizedTasks object with today, overdue, and yesterdayCompleted arrays
 *
 * @example
 * const { today, overdue, yesterdayCompleted } = useTaskRollover(tasks);
 *
 * // Render sections
 * {today.map(task => <TaskCard key={task.id} task={task} />)}
 * {overdue.length > 0 && <OverdueSection tasks={overdue} />}
 * {yesterdayCompleted.length > 0 && <YesterdaySection tasks={yesterdayCompleted} />}
 */
export function useTaskRollover(tasks: TaskInstance[]): CategorizedTasks {
  const { todayDateString, yesterdayDateString } = useTimezone();

  const categorized = useMemo(() => {
    const today: TaskInstance[] = [];
    const overdue: TaskInstance[] = [];
    const yesterdayCompleted: TaskInstance[] = [];

    // Categorize tasks
    for (const task of tasks) {
      if (task.scheduled_date === todayDateString) {
        // Today's tasks: any status (completed stay in place, don't sink)
        today.push(task);
      } else if (task.scheduled_date < todayDateString && task.status === 'pending') {
        // Overdue: only pending tasks from before today
        overdue.push(task);
      } else if (task.scheduled_date === yesterdayDateString && task.status === 'completed') {
        // Yesterday completed: only completed tasks from exactly yesterday
        yesterdayCompleted.push(task);
      }
      // Note: Tasks from before yesterday (completed or otherwise) are not shown
      // except overdue pending tasks which accumulate indefinitely
    }

    // Sort today by created_at ascending (oldest first, preserve creation order)
    // Completed tasks stay in original order position (don't sink to bottom)
    today.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });

    // Sort overdue by scheduled_date descending (newest-first, yesterday's at top)
    // Per CONTEXT.md: "Sort overdue tasks newest-first (yesterday's at top)"
    overdue.sort((a, b) => {
      // Compare dates as strings - YYYY-MM-DD format is lexicographically sortable
      // Descending: b > a means b comes first
      if (b.scheduled_date > a.scheduled_date) return 1;
      if (b.scheduled_date < a.scheduled_date) return -1;

      // Same date: sort by created_at ascending (oldest first within same day)
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });

    // Sort yesterdayCompleted by created_at ascending (preserve order)
    yesterdayCompleted.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });

    return { today, overdue, yesterdayCompleted };
  }, [tasks, todayDateString, yesterdayDateString]);

  return categorized;
}

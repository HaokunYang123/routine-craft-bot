import { useState, useCallback } from 'react';

/**
 * Task interface for the assignment modal task list.
 * Used by useTaskAssignment hook and task list components.
 */
export interface Task {
  /** Unique identifier using crypto.randomUUID() for stable keys */
  id: string;
  /** Required task title, editable inline */
  title: string;
  /** Optional estimated duration in minutes (for future phase) */
  estimatedMinutes?: number;
  /** Whether the task details accordion is expanded (Phase 26) */
  isExpanded: boolean;
}

/**
 * Creates a new empty task with a unique ID.
 */
function createEmptyTask(): Task {
  return {
    id: crypto.randomUUID(),
    title: '',
    isExpanded: false,
  };
}

/**
 * Hook for managing task list state in the assignment modal.
 * Provides add, update, delete, reorder, and reset operations.
 *
 * @returns Task list state and manipulation functions
 *
 * @example
 * ```tsx
 * const { tasks, addTask, updateTask, deleteTask, reorderTasks, resetTasks } = useTaskAssignment();
 *
 * // Add a new task
 * addTask();
 *
 * // Update a task's title
 * updateTask('task-id', { title: 'New title' });
 *
 * // Delete a task
 * deleteTask('task-id');
 *
 * // Reorder tasks (for drag-drop)
 * reorderTasks(0, 2); // Move task from index 0 to index 2
 *
 * // Reset to initial state (one empty task)
 * resetTasks();
 * ```
 */
export function useTaskAssignment() {
  // Initialize with one empty task per CONTEXT.md decision:
  // "Modal opens with one empty task row already present"
  const [tasks, setTasks] = useState<Task[]>(() => [createEmptyTask()]);

  /**
   * Adds a new empty task at the end of the list.
   */
  const addTask = useCallback(() => {
    setTasks((current) => [...current, createEmptyTask()]);
  }, []);

  /**
   * Updates a specific task by ID with partial updates.
   * @param id - The task ID to update
   * @param updates - Partial task object with fields to update
   */
  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      )
    );
  }, []);

  /**
   * Removes a task by ID. Allows deleting all tasks (empty list allowed).
   * @param id - The task ID to delete
   */
  const deleteTask = useCallback((id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  /**
   * Reorders tasks by moving a task from one index to another.
   * Used by drag-and-drop functionality in Phase 24-02.
   * @param oldIndex - The current index of the task
   * @param newIndex - The target index to move the task to
   */
  const reorderTasks = useCallback((oldIndex: number, newIndex: number) => {
    setTasks((current) => {
      // Guard against invalid indices
      if (
        oldIndex < 0 ||
        oldIndex >= current.length ||
        newIndex < 0 ||
        newIndex >= current.length
      ) {
        return current;
      }

      const result = [...current];
      const [removed] = result.splice(oldIndex, 1);
      result.splice(newIndex, 0, removed);
      return result;
    });
  }, []);

  /**
   * Resets the task list to initial state (one empty task).
   * Called when modal closes to clear previous state.
   */
  const resetTasks = useCallback(() => {
    setTasks([createEmptyTask()]);
  }, []);

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    resetTasks,
  };
}

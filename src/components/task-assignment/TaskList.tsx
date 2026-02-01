import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskRow } from './TaskRow';
import type { Task } from '@/hooks/useTaskAssignment';

interface TaskListProps {
  /** Array of tasks to display */
  tasks: Task[];
  /** Callback when a task is updated */
  onUpdate: (id: string, updates: Partial<Task>) => void;
  /** Callback when a task should be deleted */
  onDelete: (id: string) => void;
  /** Callback to add a new task */
  onAdd: () => void;
  /** Callback to reorder tasks (for drag-drop in Plan 02) */
  onReorder: (oldIndex: number, newIndex: number) => void;
}

/**
 * Task list container component.
 *
 * Renders a list of TaskRow components with an Add Task button below.
 * Prepared for drag-drop functionality in Plan 02 - DndContext will wrap this.
 *
 * @example
 * ```tsx
 * const { tasks, addTask, updateTask, deleteTask, reorderTasks } = useTaskAssignment();
 *
 * <TaskList
 *   tasks={tasks}
 *   onUpdate={updateTask}
 *   onDelete={deleteTask}
 *   onAdd={addTask}
 *   onReorder={reorderTasks}
 * />
 * ```
 */
export function TaskList({
  tasks,
  onUpdate,
  onDelete,
  onAdd,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onReorder, // Will be used in Plan 02 for drag-drop
}: TaskListProps) {
  return (
    <div className="space-y-3">
      {/* Task rows */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onUpdate={(updates) => onUpdate(task.id, updates)}
            onDelete={() => onDelete(task.id)}
            canDelete={tasks.length > 1}
            // dragHandleProps will be added in Plan 02
          />
        ))}
      </div>

      {/* Add Task button - primary action per CONTEXT.md */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAdd}
        className="text-btn-secondary border-btn-secondary/30 hover:bg-btn-secondary/10"
      >
        <Plus className="w-4 h-4 mr-1" />
        Add Task
      </Button>
    </div>
  );
}

import { useState } from 'react';
import { Plus, GripVertical, ChevronRight, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  /** Callback to reorder tasks */
  onReorder: (oldIndex: number, newIndex: number) => void;
}

/**
 * Non-sortable preview of a task row for the DragOverlay.
 * Per RESEARCH.md: Never render useSortable components inside DragOverlay.
 */
function TaskRowPreview({ task }: { task: Task }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border border-border bg-card",
        "shadow-lg opacity-95"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grabbing text-muted-foreground"
        aria-label="Dragging"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <span className={cn(
          'py-1 px-2 rounded block truncate',
          !task.title && 'text-muted-foreground'
        )}>
          {task.title || 'Task title'}
        </span>
      </div>

      {/* Expand chevron */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground shrink-0"
        aria-label="Expand task details"
        disabled
      >
        <ChevronRight
          className={cn(
            'w-4 h-4 transition-transform',
            task.isExpanded && 'rotate-90'
          )}
        />
      </Button>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground shrink-0"
        aria-label="Delete task"
        disabled
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

/**
 * Task list container component with drag-and-drop reordering.
 *
 * Features:
 * - Mouse drag with 8px distance constraint (prevents accidental drags)
 * - Touch drag with 250ms long-press delay (per CONTEXT.md decisions)
 * - DragOverlay for smooth drag preview
 * - Blue drop indicator via CSS when dragging over items
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
  onReorder,
}: TaskListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors per RESEARCH.md
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 }, // Prevents accidental drags
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Long-press delay per CONTEXT.md
        tolerance: 5, // Finger jitter tolerance
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      onReorder(oldIndex, newIndex);
    }
    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* Task rows */}
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onUpdate={(updates) => onUpdate(task.id, updates)}
                onDelete={() => onDelete(task.id)}
                canDelete={tasks.length > 1}
              />
            ))}
          </div>
        </SortableContext>

        {/* Drag preview overlay - always render DragOverlay, conditionally render children */}
        <DragOverlay>
          {activeTask ? <TaskRowPreview task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

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

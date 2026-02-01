import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TaskList } from './TaskList';
import { useTaskAssignment, type Task } from '@/hooks/useTaskAssignment';

interface AssignTaskModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when the modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** Student or group name to display in header */
  targetName: string;
  /** Whether assigning to a student or group (for header text) */
  targetType: 'student' | 'group';
  /** Callback when Assign button is clicked with the tasks */
  onAssign?: (tasks: Task[]) => void;
}

/**
 * Main modal component for assigning tasks to students or groups.
 *
 * Structure (per CONTEXT.md and MODL-01, MODL-02, MODL-03):
 * - DialogContent with ~500-600px width
 * - DialogHeader with title showing target name and explanatory subtext
 * - Body: TaskList component
 * - DialogFooter: Cancel (outline) and Assign (primary) buttons
 *
 * Modal opens with one empty task ready for typing per CONTEXT.md decision.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <AssignTaskModal
 *   open={open}
 *   onOpenChange={setOpen}
 *   targetName="John Doe"
 *   targetType="student"
 *   onAssign={(tasks) => {
 *     // Handle task assignment
 *     console.log('Assigning tasks:', tasks);
 *   }}
 * />
 * ```
 */
export function AssignTaskModal({
  open,
  onOpenChange,
  targetName,
  targetType,
  onAssign,
}: AssignTaskModalProps) {
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    resetTasks,
  } = useTaskAssignment();

  // Reset tasks when modal closes
  useEffect(() => {
    if (!open) {
      // Small delay to allow close animation before reset
      const timer = setTimeout(() => {
        resetTasks();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, resetTasks]);

  // Check if at least one task has content
  const hasValidTasks = tasks.some((task) => task.title.trim());

  const handleAssign = () => {
    // Filter to only tasks with content
    const validTasks = tasks.filter((task) => task.title.trim());
    if (validTasks.length > 0 && onAssign) {
      onAssign(validTasks);
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            Assign Tasks to {targetName}
          </DialogTitle>
          <DialogDescription>
            Add tasks below. Set due date and schedule in Defaults.
          </DialogDescription>
        </DialogHeader>

        {/* Task list body */}
        <div className="py-4">
          <TaskList
            tasks={tasks}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onAdd={addTask}
            onReorder={reorderTasks}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!hasValidTasks}
            className="bg-cta-primary hover:bg-cta-hover text-white"
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

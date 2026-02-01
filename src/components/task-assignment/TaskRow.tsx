import { useState, useRef, useEffect } from 'react';
import { GripVertical, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Task } from '@/hooks/useTaskAssignment';

interface TaskRowProps {
  /** The task data to display */
  task: Task;
  /** Callback when task is updated */
  onUpdate: (updates: Partial<Task>) => void;
  /** Callback when task should be deleted */
  onDelete: () => void;
  /** Whether delete is allowed (false when only one task remains, but deletion still works per decisions) */
  canDelete: boolean;
  /** Drag handle props from dnd-kit (Plan 02 - spread onto grip handle) */
  dragHandleProps?: Record<string, unknown>;
}

/**
 * Individual task row component with inline title editing.
 *
 * Layout (per CONTEXT.md):
 * - Left: Six-dot grip handle (GripVertical icon) - always visible, cursor-grab
 * - Center: Title input OR text display (InlineEditInput pattern)
 * - Right: Expand chevron icon (ChevronRight), Delete X button
 *
 * Inline edit behavior:
 * - If title is empty, show input immediately (focused on mount)
 * - If title has content, show as text; click to switch to input
 * - On blur or Enter: save and switch back to text mode (if has content)
 * - On Escape: revert to previous value, exit edit mode
 */
export function TaskRow({
  task,
  onUpdate,
  onDelete,
  canDelete,
  dragHandleProps,
}: TaskRowProps) {
  // Start in editing mode if title is empty (new task)
  const [isEditing, setIsEditing] = useState(!task.title);
  const [inputValue, setInputValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Sync input value when task title changes externally
  useEffect(() => {
    setInputValue(task.title);
  }, [task.title]);

  const handleBlur = () => {
    // Save and exit edit mode if there's content
    if (inputValue.trim()) {
      onUpdate({ title: inputValue.trim() });
      setIsEditing(false);
    } else {
      // Keep editing if empty - don't exit edit mode
      // This keeps focus on the input for empty tasks
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Blur triggers save
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      // Revert to previous value and exit edit mode
      setInputValue(task.title);
      setIsEditing(false);
    }
  };

  const handleTitleClick = () => {
    setIsEditing(true);
  };

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
      {/* Drag handle - listeners only on handle per RESEARCH.md */}
      <button
        type="button"
        className={cn(
          'cursor-grab touch-none text-muted-foreground hover:text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded'
        )}
        aria-label="Drag to reorder"
        {...dragHandleProps}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Title - inline editable */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Task title"
            className="h-8 bg-card border-border"
          />
        ) : (
          <span
            onClick={handleTitleClick}
            className={cn(
              'cursor-text flex-1 py-1 px-2 rounded block truncate',
              'hover:bg-muted/50 transition-colors',
              !task.title && 'text-muted-foreground'
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleTitleClick();
              }
            }}
          >
            {task.title || 'Task title'}
          </span>
        )}
      </div>

      {/* Expand chevron - for accordion in Phase 26 */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Expand task details"
        onClick={() => onUpdate({ isExpanded: !task.isExpanded })}
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
        onClick={onDelete}
        className={cn(
          'h-8 w-8 text-muted-foreground hover:text-destructive shrink-0',
          !canDelete && 'opacity-50'
        )}
        aria-label="Delete task"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

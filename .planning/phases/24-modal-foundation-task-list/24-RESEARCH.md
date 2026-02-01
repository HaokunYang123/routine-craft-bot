# Phase 24: Modal Foundation + Task List - Research

**Researched:** 2026-01-31
**Domain:** React modal dialogs, drag-and-drop sortable lists, inline editing
**Confidence:** HIGH

## Summary

This phase requires building a modal for task assignment with a sortable task list featuring inline editing, drag-and-drop reordering, and touch support. The project already uses shadcn/ui Dialog components built on Radix UI, so the modal foundation is straightforward. The main technical challenge is adding drag-and-drop functionality.

**Key findings:**
1. The existing `Dialog` component from shadcn/ui (Radix UI) already handles modal layout, overlay, close button, and outside-click behavior.
2. **dnd-kit** is the recommended library for drag-and-drop in React applications. It's lightweight (~10kb), has excellent touch support with configurable activation delays (long-press), and works well inside modals via `DragOverlay`.
3. The existing `ManualTemplateBuilder.tsx` already has a similar task list pattern (with GripVertical icon) but without actual drag-drop implementation - this provides a reference for styling consistency.
4. Inline editing pattern: toggle between text display and input field on click, with focus management via refs.

**Primary recommendation:** Use dnd-kit with DragOverlay for drag-and-drop inside the modal, and implement inline editing with a simple isEditing state toggle per row.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | Drag and drop primitives | Modern, lightweight (~10kb), excellent React 18 support, built for lists |
| @dnd-kit/sortable | 8.0.0 | Sortable list preset | Purpose-built for sortable lists, provides `useSortable` hook |
| @dnd-kit/utilities | 3.2.2 | CSS transform utilities | Provides CSS.Transform for smooth drag animations |
| @radix-ui/react-dialog | 1.1.14 | Modal primitives | Already installed and used in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.462.0 | Icons (GripVertical, X, ChevronRight) | Already installed, use for grip handle and buttons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| dnd-kit | @hello-pangea/dnd | hello-pangea is simpler but larger bundle (~30kb), less flexible for touch configuration |
| dnd-kit | react-sortable-hoc | Deprecated, not maintained for React 18 |
| Custom drag-drop | HTML5 Drag API | Poor touch support, inconsistent mobile behavior |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── task-assignment/
│       ├── AssignTaskModal.tsx       # Main modal component
│       ├── TaskList.tsx              # Sortable task list container
│       ├── TaskRow.tsx               # Individual sortable task row
│       └── InlineEditInput.tsx       # Reusable inline edit component
└── hooks/
    └── useTaskAssignment.ts          # State management for task list
```

### Pattern 1: Sortable List with DragOverlay
**What:** Use DragOverlay for dragged items to prevent DOM issues inside modals
**When to use:** Always when drag-drop is inside a modal or scrollable container
**Example:**
```typescript
// Source: dnd-kit documentation
import {
  DndContext,
  closestCenter,
  DragOverlay,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

function TaskList({ tasks, onReorder }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => <SortableTaskRow key={task.id} task={task} />)}
      </SortableContext>
      <DragOverlay>
        {activeId ? <TaskRowPreview task={tasks.find(t => t.id === activeId)} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### Pattern 2: Sortable Item with Drag Handle
**What:** Attach drag listeners only to the grip handle, not entire row
**When to use:** When rows have clickable/editable content
**Example:**
```typescript
// Source: dnd-kit documentation
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableTaskRow({ task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      {/* Drag handle - listeners only on handle */}
      <button {...attributes} {...listeners} className="cursor-grab touch-none">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      {/* Rest of row is NOT draggable */}
      <InlineEditInput value={task.title} onChange={...} />
      <button onClick={() => onDelete(task.id)}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
```

### Pattern 3: Inline Edit Text
**What:** Toggle between text display and input on click
**When to use:** Task title editing
**Example:**
```typescript
// Source: React inline editing pattern
function InlineEditInput({ value, onChange, placeholder }) {
  const [isEditing, setIsEditing] = useState(!value); // Start editing if empty
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    onChange(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setInputValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-8"
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className="cursor-text flex-1 py-1"
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </span>
  );
}
```

### Pattern 4: Modal Width Customization
**What:** Override default DialogContent max-width
**When to use:** Modal needs to be 500-600px per decisions
**Example:**
```typescript
// Source: Existing dialog.tsx pattern
<DialogContent className="sm:max-w-[560px]">
  {/* Modal content */}
</DialogContent>
```

### Anti-Patterns to Avoid
- **Rendering useSortable inside DragOverlay:** Never render components that call useSortable inside the DragOverlay. Create a separate presentational component for the overlay preview.
- **Not using DragOverlay in modals:** Without DragOverlay, dragged items can get clipped by modal overflow or stacking context.
- **Attaching listeners to entire row:** This breaks inline editing since clicks get intercepted by drag listeners.
- **Using scroll-behavior: smooth:** Conflicts with dnd-kit auto-scrolling.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag and drop | Custom HTML5 drag API | dnd-kit | Touch support, accessibility, animation |
| Sortable list reordering | Manual index swapping | @dnd-kit/sortable's arrayMove | Handles edge cases correctly |
| Modal overlay | Custom portal + backdrop | Radix Dialog | Focus trap, escape key, accessibility |
| Drop indicator line | Custom CSS positioning | DragOverlay + CSS | dnd-kit handles positioning automatically |
| Touch long-press | Custom touch event handling | dnd-kit TouchSensor | Handles tolerance, cancellation correctly |

**Key insight:** The combination of dnd-kit for drag-drop and Radix Dialog for the modal handles all the complex edge cases (accessibility, touch, focus management, portals) that would require significant effort to build correctly.

## Common Pitfalls

### Pitfall 1: DragOverlay Not Mounted
**What goes wrong:** Drop animations don't work; items snap instead of animating
**Why it happens:** Conditionally rendering `<DragOverlay>` instead of its children
**How to avoid:** Always render `<DragOverlay>`, conditionally render children
**Warning signs:** No smooth animation on drop

### Pitfall 2: Drag Handle Touch-Action
**What goes wrong:** Page scrolls instead of dragging on mobile
**Why it happens:** Browser intercepts touch events for scrolling
**How to avoid:** Add `touch-none` class to drag handle element
**Warning signs:** Dragging works on desktop but not mobile

```typescript
// Correct:
<button className="cursor-grab touch-none" {...listeners}>
  <GripVertical />
</button>
```

### Pitfall 3: Click vs Drag Conflict
**What goes wrong:** Clicking to edit triggers drag, or drag prevents editing
**Why it happens:** Listeners attached to the wrong element
**How to avoid:** Attach drag listeners ONLY to the grip handle, not the row
**Warning signs:** Can't click to edit task title

### Pitfall 4: Unique IDs for Tasks
**What goes wrong:** Drag reordering behaves erratically
**Why it happens:** Using array index as key/id instead of stable unique ID
**How to avoid:** Generate unique IDs when tasks are created (use crypto.randomUUID() or similar)
**Warning signs:** Wrong items move during drag

### Pitfall 5: Modal Focus Trap Interference
**What goes wrong:** Tab navigation doesn't work properly with drag-drop items
**Why it happens:** Radix Dialog focus trap conflicts with dnd-kit attributes
**How to avoid:** This is generally handled correctly by dnd-kit's attributes, but test keyboard navigation
**Warning signs:** Focus jumps unexpectedly

### Pitfall 6: Empty Task List State
**What goes wrong:** SortableContext receives empty array, throws errors
**Why it happens:** List has no items but component still renders
**How to avoid:** Always have at least one task in the array (per decisions: modal opens with one empty task)
**Warning signs:** Console errors about empty items array

## Code Examples

Verified patterns from official sources:

### Complete Sensor Configuration for Touch + Mouse
```typescript
// Source: dnd-kit documentation - Sensors page
import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';

const sensors = useSensors(
  useSensor(MouseSensor, {
    // Require 8px movement before drag starts (prevents accidental drags)
    activationConstraint: {
      distance: 8,
    },
  }),
  useSensor(TouchSensor, {
    // Long-press: 250ms delay before drag starts
    // Allow 5px movement during that delay (finger jitter)
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  })
);
```

### Array Move on Drag End
```typescript
// Source: @dnd-kit/sortable documentation
import { arrayMove } from '@dnd-kit/sortable';

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (over && active.id !== over.id) {
    setTasks((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  setActiveId(null);
};
```

### CSS Transform for Sortable Items
```typescript
// Source: @dnd-kit/utilities documentation
import { CSS } from '@dnd-kit/utilities';

const style = {
  // Transform handles the visual positioning during drag
  transform: CSS.Transform.toString(transform),
  // Transition handles the animation when other items shift
  transition,
};
```

### Existing Dialog Pattern in Codebase
```typescript
// Source: src/components/CheckInModal.tsx (existing pattern)
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Subtext</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <Button onClick={handleSubmit} disabled={!isValid}>
      Primary Action
    </Button>
  </DialogContent>
</Dialog>
```

### Existing Task Row Pattern (for styling consistency)
```typescript
// Source: src/components/templates/ManualTemplateBuilder.tsx (line 138-227)
// Use similar styling for consistency:
<div className="p-4 rounded-lg border border-border bg-card/50 space-y-3">
  <div className="flex items-start gap-3">
    <GripVertical className="w-5 h-5 text-muted-foreground mt-2 cursor-grab" />
    {/* Input fields */}
    <Button variant="ghost" size="icon" onClick={removeTask}>
      <Trash2 className="w-4 h-4" />
    </Button>
  </div>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @hello-pangea/dnd or dnd-kit | 2022 (Atlassian deprecated rbd) | Use dnd-kit for new projects |
| HTML5 Drag API | dnd-kit with TouchSensor | N/A | Required for mobile support |
| Manual portal for modals | Radix Dialog | N/A | Already using Radix in codebase |

**Deprecated/outdated:**
- react-beautiful-dnd: Deprecated by Atlassian, use @hello-pangea/dnd fork or dnd-kit
- react-sortable-hoc: Not maintained for React 18

## Open Questions

Things that couldn't be fully resolved:

1. **Drop indicator styling**
   - What we know: Decisions specify "blue drop indicator line"
   - What's unclear: dnd-kit doesn't provide built-in drop indicator; need custom CSS
   - Recommendation: Use CSS pseudo-element on the item being dragged over, with border-top or border-bottom in blue (btn-secondary color #60A5FA)

2. **Task ID generation**
   - What we know: Need stable unique IDs for sortable items
   - What's unclear: What ID format to use
   - Recommendation: Use `crypto.randomUUID()` for client-generated IDs before server save

3. **Keyboard reordering**
   - What we know: Decisions explicitly say "No keyboard reordering - mouse/touch only"
   - What's unclear: Whether to completely omit KeyboardSensor or just not document it
   - Recommendation: Omit KeyboardSensor entirely to match decisions, but ensure tab navigation works for accessibility

## Sources

### Primary (HIGH confidence)
- dnd-kit documentation (https://docs.dndkit.com) - Sortable preset, sensors, DragOverlay
- Existing codebase: `src/components/ui/dialog.tsx` - Radix Dialog setup
- Existing codebase: `src/components/CheckInModal.tsx` - Modal usage pattern
- Existing codebase: `src/components/templates/ManualTemplateBuilder.tsx` - Task list styling

### Secondary (MEDIUM confidence)
- dnd-kit GitHub (https://github.com/clauderic/dnd-kit) - Version info, issues
- [Joel M Turner inline edit tutorial](https://dev.to/joelmturner/build-an-inline-edit-text-input-with-react-hooks-4nah) - React inline edit pattern

### Tertiary (LOW confidence)
- WebSearch comparisons of dnd-kit vs hello-pangea/dnd - validated against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - dnd-kit is well-documented, versions verified, already compatible with React 18
- Architecture: HIGH - Patterns sourced from official documentation and existing codebase
- Pitfalls: HIGH - Based on documented issues and official recommendations

**Research date:** 2026-01-31
**Valid until:** 60 days (stable libraries, dnd-kit is mature)

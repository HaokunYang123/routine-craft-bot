# Phase 19: Student Dashboard Layout - Research

**Researched:** 2026-01-31
**Domain:** React component styling, responsive grid layouts, feature removal
**Confidence:** HIGH

## Summary

This phase covers two distinct areas: (1) restructuring the student dashboard to display three consistent boxes side-by-side on desktop with proper styling, and (2) removing security features (Delete Account, Change Password, 2FA) from both student and coach settings.

**Key findings from codebase investigation:**

1. **StudentHome.tsx already has three cards** with colored left borders (blue-500, amber-500, emerald-500). The cards are named "My Groups", "Coach's Notes", and "Tasks to Do". However, they use `grid-cols-1` (single column) instead of the required 3-column desktop layout.

2. **StudentSettings.tsx has NO Delete Account feature** - the requirement STUDENT-01 is effectively already satisfied for students. There's no security section at all in the student settings.

3. **CoachSettings.tsx has the security features to remove** - Contains placeholder buttons for "Change Password", "Two-Factor Authentication", and "Download My Data" inside a "Privacy & Security" card section. These buttons have no actual functionality (no onClick handlers doing real work).

4. **No backend functions exist** for account deletion, password changes, or 2FA - these are purely UI elements with no implementation.

**Primary recommendation:** Update StudentHome.tsx grid from single-column to 3-column on desktop (with mobile stacking), apply the exact styling from decisions (white background, drop shadow, rounded corners), and remove the Privacy & Security section from CoachSettings.tsx.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 3.x | Styling with utility classes | Already in use throughout codebase |
| shadcn/ui Card | - | Card component with consistent styling | Already imported and used |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cn utility | - | Conditional class merging | Already in src/lib/utils |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tailwind grid | CSS Grid | Tailwind is already the standard in this codebase |

**No installation needed - all dependencies already present.**

## Architecture Patterns

### Current File Structure (No Change Needed)
```
src/
├── pages/
│   ├── student/
│   │   ├── StudentHome.tsx     # Dashboard with 3 boxes (needs grid update)
│   │   └── StudentSettings.tsx # Already clean (no delete account)
│   └── CoachSettings.tsx       # Has security section to remove
└── components/ui/
    └── card.tsx                # Already has shadow-sm in base class
```

### Pattern 1: Responsive Grid Layout
**What:** Use Tailwind's responsive grid classes for 1-col mobile / 3-col desktop
**When to use:** Dashboard box layouts
**Example:**
```typescript
// Source: Current codebase pattern + Tailwind docs
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
  <Card>Box 1</Card>
  <Card>Box 2</Card>
  <Card>Box 3</Card>
</div>
```

### Pattern 2: Dashboard Box Styling (Per Decisions)
**What:** White background, colored left border, subtle shadow, rounded corners
**When to use:** The three dashboard boxes
**Example:**
```typescript
// Source: User decisions in CONTEXT.md
<Card className="bg-white shadow-md rounded-lg border-l-4 border-l-blue-500">
  <CardHeader className="pb-2">
    <CardTitle className="font-bold text-base">My Group</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content or empty state */}
  </CardContent>
</Card>
```

### Pattern 3: Equal Height Cards with CSS Grid
**What:** CSS Grid automatically creates equal-height items in the same row
**When to use:** When boxes should match tallest content
**Example:**
```typescript
// Source: CSS Grid specification
// grid-cols-3 naturally gives equal-height cells in a row
// Add `h-full` to Card if needed for explicit full height
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
  <Card className="h-full">...</Card>
  <Card className="h-full">...</Card>
  <Card className="h-full">...</Card>
</div>
```

### Anti-Patterns to Avoid
- **Removing shadow-sm from Card base**: The Card component already has `shadow-sm`. Override with `shadow-md` for the dashboard boxes rather than modifying the base component.
- **Using flexbox for equal heights**: CSS Grid handles equal-height items natively; flexbox requires extra work.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive breakpoints | Custom media queries | Tailwind `md:` prefix | Already standard in codebase |
| Card shadows | Custom shadow CSS | Tailwind `shadow-md` class | Consistent with design system |
| Border styling | Inline styles | Tailwind `border-l-4 border-l-{color}` | Already used in current code |

**Key insight:** The existing Card component and Tailwind utilities already provide everything needed. No new components or custom CSS required.

## Common Pitfalls

### Pitfall 1: Breaking Mobile Layout
**What goes wrong:** Adding 3-column grid breaks mobile view
**Why it happens:** Not using responsive classes
**How to avoid:** Always use `grid-cols-1 md:grid-cols-3` pattern
**Warning signs:** Cards appear squished on mobile device testing

### Pitfall 2: Inconsistent Border Colors
**What goes wrong:** Boxes have different border colors than intended
**Why it happens:** Using wrong Tailwind color classes
**How to avoid:** Use the exact colors from current implementation (blue-500, amber-500, emerald-500) or theme colors
**Warning signs:** Colors don't match existing UI elements

### Pitfall 3: Orphaned Backend Code
**What goes wrong:** Removing UI but leaving unused backend functions
**Why it happens:** Not checking for related database functions
**How to avoid:** Grep codebase for delete_account, change_password patterns
**Warning signs:** Unused functions in codebase

### Pitfall 4: Empty State Not Visible
**What goes wrong:** Empty boxes collapse or hide when no data
**Why it happens:** Conditional rendering hides entire card
**How to avoid:** Always render the card, only change content
**Warning signs:** Fewer than 3 boxes visible when data is missing

## Code Examples

Verified patterns from the existing codebase:

### Current Card Implementation (StudentHome.tsx line 533)
```typescript
// Source: src/pages/student/StudentHome.tsx
// Current implementation - already has left border
<Card className="border-l-4 border-l-blue-500">
  <CardHeader className="pb-2">
    <CardTitle className="flex items-center gap-2 text-base">
      <Users className="w-5 h-5 text-blue-500" />
      My Groups
    </CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### Required Grid Change (Line 531)
```typescript
// Current: grid-cols-1
<div className="grid grid-cols-1 gap-6">

// Required: responsive 3-column
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
```

### Required Box Styling Update
```typescript
// Current Card base: "rounded-lg border bg-card text-card-foreground shadow-sm"
// Need to add/override for dashboard boxes:
<Card className="bg-white shadow-md rounded-lg border-l-4 border-l-blue-500 h-full">
```

### Security Section to Remove (CoachSettings.tsx lines 206-241)
```typescript
// Source: src/pages/CoachSettings.tsx
// This entire section needs to be removed:
{/* Privacy Section */}
<Card className="border-border">
  <CardHeader>
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-btn-secondary/20">
        <Shield className="w-5 h-5 text-btn-secondary" />
      </div>
      <div>
        <CardTitle className="text-lg text-foreground">
          Privacy & Security
        </CardTitle>
        <CardDescription>Manage your security settings</CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    <Button variant="outline">Change Password</Button>
    <Button variant="outline">Two-Factor Authentication</Button>
    <Button variant="outline">Download My Data</Button>
  </CardContent>
</Card>
```

### Empty State Pattern
```typescript
// Source: Pattern from existing code in StudentHome.tsx
// Empty state with gray muted text
<p className="text-sm text-muted-foreground text-center py-4">
  No group yet
</p>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flexbox for equal heights | CSS Grid | N/A | Grid is native equal-height |
| Custom media queries | Tailwind responsive prefixes | N/A | Standard in this codebase |

**Deprecated/outdated:**
- None relevant - the codebase is already using modern Tailwind patterns

## Code Inventory (Critical for Planning)

### Files to Modify

| File | Change Required | Lines Affected |
|------|-----------------|----------------|
| `src/pages/student/StudentHome.tsx` | Grid update, box styling | ~531, ~533, ~638, ~722 |
| `src/pages/CoachSettings.tsx` | Remove Privacy & Security section | Lines 206-241 |

### Files Already Correct

| File | Why No Change |
|------|---------------|
| `src/pages/student/StudentSettings.tsx` | No Delete Account exists |
| `src/components/ui/card.tsx` | Base styling sufficient |

### Colors in Current Implementation

| Box | Current Border | Tailwind Class |
|-----|----------------|----------------|
| My Groups | Blue | `border-l-blue-500` |
| Coach's Notes | Amber | `border-l-amber-500` |
| Tasks to Do | Green | `border-l-emerald-500` |

### Theme Colors Available

From `tailwind.config.ts` and `index.css`:
- CTA Primary: `#3E7E10` (green)
- CTA Hover: `#2d5e0b`
- Button Secondary: `#60A5FA` (blue)
- Urgent: `#CB3D0A` (orange)

User decision allows Claude's discretion on exact shades. Current blue-500, amber-500, emerald-500 are appropriate and match the app's feel.

## Open Questions

Things that couldn't be fully resolved:

1. **Box order on mobile**
   - What we know: Desktop will be 3 columns side-by-side
   - What's unclear: Should mobile preserve My Groups | Notes | Tasks order or reorder for UX?
   - Recommendation: Keep same order (My Groups, Notes, Tasks) since grid stacking is natural and current order works

2. **Card minimum height**
   - What we know: Equal height requested, CSS Grid handles this
   - What's unclear: Should empty boxes have a minimum height or just match content?
   - Recommendation: Let CSS Grid equalize heights naturally; no explicit min-height needed unless testing shows issues

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/pages/student/StudentHome.tsx` - Current implementation analyzed
- Codebase inspection: `src/pages/student/StudentSettings.tsx` - Confirmed no Delete Account
- Codebase inspection: `src/pages/CoachSettings.tsx` - Privacy section identified
- Codebase inspection: `src/index.css` and `tailwind.config.ts` - Theme colors verified

### Secondary (MEDIUM confidence)
- N/A - All findings from direct codebase inspection

### Tertiary (LOW confidence)
- N/A

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already in codebase, no new dependencies
- Architecture: HIGH - Pattern clear from existing code
- Pitfalls: HIGH - Common responsive design issues, verified against codebase
- Code inventory: HIGH - Line numbers verified through file reads

**Research date:** 2026-01-31
**Valid until:** 60 days (stable codebase patterns, no external dependencies)

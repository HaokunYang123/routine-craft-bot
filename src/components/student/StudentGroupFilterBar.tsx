interface StudentGroupFilterBarProps {
  availableGroups: Array<{ group_id: string; group_name: string; group_color?: string }>;
  activeFilterGroupId: string | null;
  onFilterChange: (groupId: string | null) => void;
}

export function StudentGroupFilterBar({
  availableGroups,
  activeFilterGroupId,
  onFilterChange,
}: StudentGroupFilterBarProps) {
  if (availableGroups.length <= 1) return null;

  return (
    <div className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onFilterChange(null)}
          className="shrink-0 rounded-full border border-border bg-muted/20 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
          style={
            activeFilterGroupId === null
              ? {
                  backgroundColor: "hsl(var(--primary))",
                  borderColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                }
              : undefined
          }
        >
          All
        </button>
        {availableGroups.map((group) => {
          const isActive = activeFilterGroupId === group.group_id;
          return (
            <button
              key={group.group_id}
              type="button"
              onClick={() => onFilterChange(group.group_id)}
              className="shrink-0 rounded-full border border-border bg-muted/20 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
              style={
                isActive
                  ? {
                      backgroundColor: group.group_color || "hsl(var(--primary))",
                      borderColor: group.group_color || "hsl(var(--primary))",
                      color: "#ffffff",
                    }
                  : undefined
              }
            >
              {group.group_name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

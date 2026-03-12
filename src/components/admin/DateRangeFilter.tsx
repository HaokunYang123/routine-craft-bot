import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
}

type PresetKey = "7" | "30" | "90" | "all" | null;

const PRESETS = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All time" },
] as const;

function getSelectedPreset(startDate: string | null, endDate: string | null): PresetKey {
  if (!startDate && !endDate) {
    return "all";
  }

  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();

  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return null;
  }

  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 7) {
    return "7";
  }

  if (diffDays === 30) {
    return "30";
  }

  if (diffDays === 90) {
    return "90";
  }

  return null;
}

export function DateRangeFilter({ startDate, endDate, onChange }: DateRangeFilterProps) {
  const selectedPreset = getSelectedPreset(startDate, endDate);

  const handlePresetClick = (days?: number) => {
    if (!days) {
      onChange(null, null);
      return;
    }

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    onChange(start.toISOString(), end.toISOString());
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Date range</p>
          <p className="text-xs text-muted-foreground">
            Presets apply across all analytics tabs. Default is all-time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const isActive = selectedPreset === preset.key;

            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePresetClick("days" in preset ? preset.days : undefined)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  "border-border/60 bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground",
                  isActive && "border-border bg-background text-foreground shadow-sm",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

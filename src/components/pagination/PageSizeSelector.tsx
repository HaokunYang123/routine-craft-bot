import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PageSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
  totalCount?: number;
  loadedCount?: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/**
 * Dropdown for selecting page size with "Showing X of Y" counter.
 * Default sizes: 10, 25, 50 (per CONTEXT.md).
 */
export function PageSizeSelector({
  value,
  onChange,
  totalCount,
  loadedCount,
}: PageSizeSelectorProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show</span>
        <Select
          value={String(value)}
          onValueChange={(val) => onChange(Number(val))}
        >
          <SelectTrigger className="w-[70px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {totalCount !== undefined && loadedCount !== undefined && (
        <span className="text-sm text-muted-foreground">
          Showing {loadedCount} of {totalCount}
        </span>
      )}
    </div>
  );
}

/**
 * Timezone selector component using shadcn/ui Select
 *
 * Groups timezones by region (America, Europe, Asia, etc.)
 * Shows current offset (e.g., "New York (GMT-5)")
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAllTimezones, getTimezoneDisplayName } from '@/lib/timezone';
import { useMemo } from 'react';

interface TimezoneSelectProps {
  value: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
}

export function TimezoneSelect({ value, onChange, disabled }: TimezoneSelectProps) {
  // Group timezones by region
  const groupedTimezones = useMemo(() => {
    const timezones = getAllTimezones();
    const groups: Record<string, string[]> = {};

    timezones.forEach((tz) => {
      const [region] = tz.split('/');
      // Special case: Etc, UTC, etc. go under "Other"
      const groupName = region.includes('/') ? region : (
        ['Etc', 'UTC'].includes(region) ? 'Other' : region
      );
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(tz);
    });

    // Sort regions alphabetically, but put common ones first
    const priorityOrder = ['America', 'Europe', 'Asia', 'Australia', 'Pacific', 'Africa', 'Other'];
    const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
      const aIdx = priorityOrder.indexOf(a);
      const bIdx = priorityOrder.indexOf(b);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedEntries;
  }, []);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select timezone">
          {value ? getTimezoneDisplayName(value) : 'Select timezone'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80 overflow-y-auto">
        {groupedTimezones.map(([region, timezones]) => (
          <div key={region}>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {region}
            </div>
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz} className="pl-4">
                {getTimezoneDisplayName(tz)}
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}

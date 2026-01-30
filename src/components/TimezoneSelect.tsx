/**
 * Timezone selector component using shadcn/ui Select
 *
 * Simplified to common US timezones with friendly names and UTC offsets
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMemo } from 'react';

// Common US timezones with friendly names
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
] as const;

// Get UTC offset for a timezone (e.g., "UTC-5" or "UTC+9")
function getUtcOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    // Returns something like "GMT-5" or "GMT+9", convert to "UTC-5"
    return offsetPart?.value?.replace('GMT', 'UTC') || '';
  } catch {
    return '';
  }
}

// Map IANA timezone to friendly label with offset
function getTimezoneLabel(tz: string): string {
  const found = TIMEZONES.find((t) => t.value === tz);
  if (!found) return tz;
  const offset = getUtcOffset(tz);
  return offset ? `${found.label} (${offset})` : found.label;
}

interface TimezoneSelectProps {
  value: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
}

export function TimezoneSelect({ value, onChange, disabled }: TimezoneSelectProps) {
  // Calculate labels with offsets (memoized since offset calculation is slightly expensive)
  const timezonesWithOffsets = useMemo(() => {
    return TIMEZONES.map((tz) => ({
      ...tz,
      displayLabel: getTimezoneLabel(tz.value),
    }));
  }, []);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select timezone">
          {value ? getTimezoneLabel(value) : 'Select timezone'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {timezonesWithOffsets.map((tz) => (
          <SelectItem key={tz.value} value={tz.value}>
            {tz.displayLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

-- Add timezone column to profiles table
-- Stores IANA timezone name (e.g., "America/New_York")
-- Nullable - will be auto-detected on first login if not set

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.timezone IS 'IANA timezone name (e.g., America/New_York). Auto-detected from browser if null.';

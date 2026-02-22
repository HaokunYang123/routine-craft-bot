const REQUIRED_CLIENT_VARS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;

const hasPrivilegedMarker = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return normalized.startsWith("sb_secret_") || /service[_-]?role/.test(normalized);
};

export function validateClientEnv(): void {
  const env = import.meta.env as Record<string, string | undefined>;

  REQUIRED_CLIENT_VARS.forEach((name) => {
    const value = env[name];
    if (!value || !value.trim()) {
      throw new Error(
        `[env-check] Missing required environment variable: ${name}. Add it to your .env file.`,
      );
    }
  });

  Object.entries(env).forEach(([name, value]) => {
    if (!name.startsWith("VITE_")) return;
    if (!value) return;
    if (!hasPrivilegedMarker(value)) return;

    console.warn(
      `[env-check] ${name} appears to contain a privileged key. Do not expose service or secret keys via VITE_ variables.`,
    );
  });
}

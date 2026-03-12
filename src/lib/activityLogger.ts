import { supabase } from "@/integrations/supabase/client";

export function logActivity(eventType: string, metadata: Record<string, unknown> = {}) {
  void supabase
    .rpc("log_activity_event", {
      p_event_type: eventType,
      p_metadata: metadata,
    })
    .then(({ error }) => {
      if (error) {
        console.warn(`[activity] Failed to log ${eventType}:`, error.message);
      }
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(`[activity] Failed to log ${eventType}:`, message);
    });
}

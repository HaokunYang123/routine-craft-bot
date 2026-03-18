/*
  Mark Missed Tasks Cron Job

  Runs nightly to mark pending tasks from previous days as "missed".
  This prevents "infinite pending" state where old tasks stay pending forever,
  which would corrupt completion rate analytics.

  Schedule: Run daily at midnight UTC via Supabase cron

  To set up the cron trigger, run this SQL in Supabase:

  SELECT cron.schedule(
    'mark-missed-tasks',
    '0 0 * * *',  -- Every day at midnight UTC
    $$
    SELECT net.http_post(
      url := '<YOUR_PROJECT_URL>/functions/v1/mark-missed-tasks',
      headers := '{"Authorization": "Bearer <YOUR_EDGE_FUNCTION_SECRET>"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
    $$
  );
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

serve(async (req) => {
  // --- Caller verification ---
  const expectedSecret = Deno.env.get("EDGE_FUNCTION_SECRET");
  if (!expectedSecret) {
    return new Response(
      JSON.stringify({ error: "server_misconfigured" }),
      { status: 500, headers: jsonHeaders }
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const providedSecret = authHeader.replace(/^Bearer\s+/i, "");

  if (providedSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: jsonHeaders }
    );
  }
  // --- End caller verification ---

  const startTime = Date.now();
  console.log("[mark-missed-tasks] Cron job started at:", new Date().toISOString());

  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in YYYY-MM-DD format (UTC)
    const today = new Date().toISOString().split("T")[0];
    console.log("[mark-missed-tasks] Today (UTC):", today);

    // Update all pending tasks scheduled before today to "missed"
    const { data, error, count } = await supabase
      .from("task_instances")
      .update({
        status: "missed",
        updated_at: new Date().toISOString()
      })
      .eq("status", "pending")
      .lt("scheduled_date", today)
      .select("id");

    if (error) {
      console.error("[mark-missed-tasks] Database error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    const updatedCount = data?.length || 0;
    const elapsed = Date.now() - startTime;

    console.log("[mark-missed-tasks] Marked", updatedCount, "tasks as missed in", elapsed, "ms");

    return new Response(
      JSON.stringify({
        success: true,
        tasksMarkedMissed: updatedCount,
        date: today,
        executionTimeMs: elapsed,
      }),
      {
        headers: jsonHeaders,
      }
    );

  } catch (error: unknown) {
    const elapsed = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[mark-missed-tasks] Error after", elapsed, "ms:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: jsonHeaders,
      }
    );
  }
});

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
      headers := '{"Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
    $$
  );
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error("[mark-missed-tasks] Error after", elapsed, "ms:", error.message);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

type TaskInstanceWebhookRecord = {
  id?: string | null;
  assignment_id?: string | null;
  name?: string | null;
  scheduled_date?: string | null;
  status?: string | null;
  assignee_id?: string | null;
  coach_id?: string | null;
};

type WebhookBody = {
  type?: string;
  record?: TaskInstanceWebhookRecord | null;
  old_record?: TaskInstanceWebhookRecord | null;
};

type NotificationPrefsRow = {
  notify_on_task_completion: boolean;
  notify_on_task_assignment: boolean;
  digest_frequency: string;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: string | null;
};

type AssignmentRow = {
  id: string;
  assignee_id: string | null;
  assigned_by: string | null;
  group_id: string | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = "https://www.teachcoachconnect.com";
const RESEND_FROM = "TeachCoachConnect <notifications@teachcoachconnect.com>";
const DEDUP_WINDOW_MS = 5 * 60 * 1000;

const jsonHeaders = { "Content-Type": "application/json" };

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[send-task-notification] Missing Supabase environment variables");
}

const supabase = createClient(
  SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY ?? "",
);

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const displayName = (profile: ProfileRow | null, fallback: string): string => {
  const raw = profile?.display_name?.trim() || profile?.email?.trim() || fallback;
  return raw.length > 0 ? raw : fallback;
};

async function fetchAssignment(assignmentId: string | null | undefined): Promise<AssignmentRow | null> {
  if (!assignmentId) return null;

  const { data, error } = await supabase
    .from("assignments")
    .select("id, assignee_id, assigned_by, group_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (error) {
    console.error("[send-task-notification] fetchAssignment failed:", error.message);
    return null;
  }

  return (data as AssignmentRow | null) ?? null;
}

async function fetchProfile(userId: string | null | undefined): Promise<ProfileRow | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, email, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[send-task-notification] fetchProfile failed:", error.message);
    return null;
  }

  return (data as ProfileRow | null) ?? null;
}

async function fetchNotificationPrefs(userId: string | null | undefined): Promise<NotificationPrefsRow | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("notify_on_task_completion, notify_on_task_assignment, digest_frequency")
    .eq("owner_profile_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[send-task-notification] fetchNotificationPrefs failed:", error.message);
    return null;
  }

  return (data as NotificationPrefsRow | null) ?? null;
}

async function wasRecentlySent(
  recipientEmail: string,
  relatedInstanceId: string,
  triggerEventType: "assignment" | "completion",
): Promise<boolean> {
  const threshold = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("notification_send_log")
    .select("log_entry_id")
    .eq("recipient_email", recipientEmail)
    .eq("related_instance_id", relatedInstanceId)
    .eq("trigger_event_type", triggerEventType)
    .gt("dispatched_at", threshold)
    .limit(1);

  if (error) {
    console.error("[send-task-notification] wasRecentlySent failed:", error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

async function logSend(
  recipientEmail: string,
  relatedInstanceId: string,
  triggerEventType: "assignment" | "completion",
): Promise<void> {
  const { error } = await supabase
    .from("notification_send_log")
    .insert({
      recipient_email: recipientEmail,
      related_instance_id: relatedInstanceId,
      trigger_event_type: triggerEventType,
    });

  if (error) {
    console.error("[send-task-notification] logSend failed:", error.message);
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[send-task-notification] RESEND_API_KEY is not set; skipping email send");
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    console.error("[send-task-notification] Resend error:", response.status, bodyText);
    return false;
  }

  return true;
}

async function handleAssignmentNotification(record: TaskInstanceWebhookRecord): Promise<void> {
  if (!record.id || !record.assignee_id) {
    return;
  }

  const prefs = await fetchNotificationPrefs(record.assignee_id);
  if (!prefs || !prefs.notify_on_task_assignment || prefs.digest_frequency !== "immediate") {
    return;
  }

  const assigneeProfile = await fetchProfile(record.assignee_id);
  const assigneeEmail = assigneeProfile?.email?.trim();
  if (!assigneeEmail) {
    return;
  }

  const recentlySent = await wasRecentlySent(assigneeEmail, record.id, "assignment");
  if (recentlySent) {
    return;
  }

  const assignment = await fetchAssignment(record.assignment_id);
  const coachId = record.coach_id ?? assignment?.assigned_by ?? null;
  const coachProfile = await fetchProfile(coachId);

  const studentName = displayName(assigneeProfile, "there");
  const coachName = displayName(coachProfile, "Your coach");
  const taskTitle = (record.name?.trim() || "New task");
  const scheduledDate = record.scheduled_date?.trim() || "an upcoming date";

  const subject = `[TCC] New task: ${taskTitle}`;
  const html = [
    `<p>Hi ${escapeHtml(studentName)},</p>`,
    `<p>${escapeHtml(coachName)} assigned you a new task: <strong>${escapeHtml(taskTitle)}</strong> on ${escapeHtml(scheduledDate)}.</p>`,
    `<p>Log in to view details: <a href="${APP_URL}">TeachCoachConnect</a></p>`,
  ].join("");

  const sent = await sendEmail(assigneeEmail, subject, html);
  if (sent) {
    await logSend(assigneeEmail, record.id, "assignment");
  }
}

async function handleCompletionNotification(record: TaskInstanceWebhookRecord): Promise<void> {
  if (!record.id) {
    return;
  }

  const assignment = await fetchAssignment(record.assignment_id);
  const coachId = record.coach_id ?? assignment?.assigned_by ?? null;
  if (!coachId) {
    return;
  }

  const prefs = await fetchNotificationPrefs(coachId);
  if (!prefs || !prefs.notify_on_task_completion || prefs.digest_frequency !== "immediate") {
    return;
  }

  const coachProfile = await fetchProfile(coachId);
  const coachEmail = coachProfile?.email?.trim();
  if (!coachEmail) {
    return;
  }

  const recentlySent = await wasRecentlySent(coachEmail, record.id, "completion");
  if (recentlySent) {
    return;
  }

  const studentProfile = await fetchProfile(record.assignee_id);
  const coachName = displayName(coachProfile, "coach");
  const studentName = displayName(studentProfile, "A student");
  const taskTitle = (record.name?.trim() || "Task");
  const scheduledDate = record.scheduled_date?.trim() || "an earlier date";

  const subject = `[TCC] Task completed: ${taskTitle} by ${studentName}`;
  const html = [
    `<p>Hi ${escapeHtml(coachName)},</p>`,
    `<p>${escapeHtml(studentName)} completed <strong>${escapeHtml(taskTitle)}</strong> (scheduled ${escapeHtml(scheduledDate)}).</p>`,
    `<p>View details: <a href="${APP_URL}">TeachCoachConnect</a></p>`,
  ].join("");

  const sent = await sendEmail(coachEmail, subject, html);
  if (sent) {
    await logSend(coachEmail, record.id, "completion");
  }
}

serve(async (req: Request) => {
  // --- Caller verification ---
  const expectedSecret = Deno.env.get("EDGE_FUNCTION_SECRET");
  if (!expectedSecret) {
    return new Response(
      JSON.stringify({ error: "server_misconfigured" }),
      { status: 500, headers: jsonHeaders },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const providedSecret = authHeader.replace(/^Bearer\s+/i, "");

  if (providedSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: jsonHeaders },
    );
  }
  // --- End caller verification ---

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables are not configured");
    }

    const body = (await req.json()) as WebhookBody;
    const type = typeof body.type === "string" ? body.type : "";
    const record = body.record ?? null;
    const oldRecord = body.old_record ?? null;

    if (!record || !record.id) {
      return new Response(JSON.stringify({ ok: true, skipped: "missing_record" }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    if (type === "INSERT") {
      await handleAssignmentNotification(record);
    } else if (type === "UPDATE") {
      const oldStatus = oldRecord?.status ?? null;
      const newStatus = record.status ?? null;

      if (oldStatus !== "completed" && newStatus === "completed") {
        await handleCompletionNotification(record);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("[send-task-notification] error:", error);
    return new Response(JSON.stringify({ ok: false, error: "internal_error" }), {
      status: 200,
      headers: jsonHeaders,
    });
  }
});

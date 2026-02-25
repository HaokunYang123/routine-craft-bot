import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

type SupportedAction =
  | "generate_plan"
  | "personalize"
  | "weekly_summary"
  | "polish"
  | "student_recap";

const SUPPORTED_ACTIONS: SupportedAction[] = [
  "generate_plan",
  "personalize",
  "weekly_summary",
  "polish",
  "student_recap",
];

const SUPPORTED_ACTION_SET = new Set<SupportedAction>(SUPPORTED_ACTIONS);

const ALLOWED_FIELDS: Record<SupportedAction, readonly string[]> = {
  generate_plan: ["subject", "ageGroup", "skillLevel", "focusAreas", "duration"],
  personalize: [
    "template",
    "difficulty",
    "pacing",
    "learningStyle",
    "accommodations",
    "additionalNotes",
    "modifier",
  ],
  weekly_summary: ["groupName", "summaryData"],
  polish: ["roughText"],
  student_recap: [
    "studentName",
    "completedCount",
    "missedCount",
    "totalCount",
    "completionRate",
    "recentTasks",
  ],
};

const TASK_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    description: { type: "STRING" },
    day_offset: { type: "INTEGER" },
    duration_minutes: { type: "INTEGER" },
    start_time: { type: "STRING", nullable: true },
    end_time: { type: "STRING", nullable: true },
  },
  required: ["title", "description", "day_offset", "duration_minutes", "start_time", "end_time"],
};

const RESPONSE_SCHEMAS: Record<SupportedAction, Record<string, unknown>> = {
  generate_plan: {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" },
      description: { type: "STRING" },
      duration_weeks: { type: "INTEGER" },
      frequency_per_week: { type: "INTEGER" },
      tasks: { type: "ARRAY", items: TASK_SCHEMA },
    },
    required: ["name", "description", "duration_weeks", "frequency_per_week", "tasks"],
  },
  personalize: {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" },
      description: { type: "STRING" },
      duration_weeks: { type: "INTEGER" },
      frequency_per_week: { type: "INTEGER" },
      tasks: { type: "ARRAY", items: TASK_SCHEMA },
      ai_note: { type: "STRING", nullable: true },
    },
    required: ["name", "description", "duration_weeks", "frequency_per_week", "tasks", "ai_note"],
  },
  weekly_summary: {
    type: "OBJECT",
    properties: {
      summary: { type: "STRING" },
      highlights: { type: "ARRAY", items: { type: "STRING" } },
      concerns: { type: "ARRAY", items: { type: "STRING" } },
      stats: {
        type: "OBJECT",
        properties: {
          totalTasks: { type: "NUMBER" },
          completionRate: { type: "NUMBER" },
          topPerformer: { type: "STRING" },
        },
        required: ["totalTasks", "completionRate", "topPerformer"],
      },
    },
    required: ["summary", "highlights", "concerns", "stats"],
  },
  polish: {
    type: "OBJECT",
    properties: {
      polished: { type: "STRING" },
    },
    required: ["polished"],
  },
  student_recap: {
    type: "OBJECT",
    properties: {
      recap: { type: "STRING" },
      summary: { type: "STRING", nullable: true },
    },
    required: ["recap"],
  },
};

const MAX_OUTPUT_TOKENS: Record<SupportedAction, number> = {
  generate_plan: 900,
  personalize: 1000,
  weekly_summary: 700,
  polish: 300,
  student_recap: 450,
};

type JsonRecord = Record<string, unknown>;

type ChatBody = {
  action?: unknown;
  payload?: unknown;
  temperature?: unknown;
  // Legacy fields still accepted but ignored for supported actions.
  messages?: unknown;
  systemPrompt?: unknown;
  userMessage?: unknown;
};

type RateCheckResult = {
  allowed?: boolean;
  remaining?: number;
  retry_after_seconds?: number;
  limit?: number;
  used?: number;
};

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
};

type PlanTaskPayload = {
  title: string;
  description: string | null;
  day_offset: number;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
};

type PlanTemplatePayload = {
  name: string;
  description: string | null;
  duration_weeks: number;
  frequency_per_week: number;
  tasks: PlanTaskPayload[];
};

type GeneratePlanPayload = {
  subject: string;
  ageGroup: string;
  skillLevel: string;
  focusAreas: string[];
  duration: number;
};

type PersonalizePayload = {
  template: PlanTemplatePayload;
  difficulty: string;
  pacing: string;
  learningStyle: string[];
  accommodations: string | null;
  additionalNotes: string | null;
};

type WeeklyStudentResultPayload = {
  studentName: string;
  totalTasks: number;
  completed: number;
  missed: number;
  excused: number;
  pending: number;
};

type WeeklySummaryPayload = {
  groupName: string;
  summaryData: {
    studentResults: WeeklyStudentResultPayload[];
    dateRange: {
      start: string;
      end: string;
    };
  };
};

type PolishPayload = {
  roughText: string;
};

type StudentRecapPayload = {
  studentName: string;
  completedCount: number;
  missedCount: number;
  totalCount: number;
  completionRate: number;
  recentTasks: Array<{
    name: string;
    status: string;
    date: string;
  }>;
};

type SanitizedPayloadByAction = {
  generate_plan: GeneratePlanPayload;
  personalize: PersonalizePayload;
  weekly_summary: WeeklySummaryPayload;
  polish: PolishPayload;
  student_recap: StudentRecapPayload;
};

const asRecord = (value: unknown): JsonRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as JsonRecord;
};

const clampInt = (value: unknown, fallback: number, min = 0, max = 10000): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
};

const clampNumber = (value: unknown, fallback: number, min = 0, max = 10000): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

const normalizeString = (value: unknown, fallback = "", maxLength = 4000): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
};

const normalizeNullableString = (value: unknown, maxLength = 4000): string | null => {
  const parsed = normalizeString(value, "", maxLength);
  return parsed ? parsed : null;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeNullableTime = (value: unknown): string | null => {
  const parsed = normalizeString(value, "", 5);
  if (!parsed) return null;
  return TIME_PATTERN.test(parsed) ? parsed : null;
};

const pickAllowedTopLevelFields = (action: SupportedAction, payload: unknown): JsonRecord => {
  const input = asRecord(payload);
  const allowed = ALLOWED_FIELDS[action];
  const picked: JsonRecord = {};

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      picked[key] = input[key];
    }
  }

  return picked;
};

const sanitizeTemplateTasks = (rawTasks: unknown): PlanTaskPayload[] => {
  if (!Array.isArray(rawTasks)) return [];

  return rawTasks
    .slice(0, 120)
    .map((task, index) => {
      const row = asRecord(task);
      const title = normalizeString(row.title, `Task ${index + 1}`, 160);
      return {
        title,
        description: normalizeNullableString(row.description, 2000),
        day_offset: clampInt(row.day_offset, index, 0, 365),
        duration_minutes: clampInt(row.duration_minutes, 30, 1, 1440),
        start_time: normalizeNullableTime(row.start_time),
        end_time: normalizeNullableTime(row.end_time),
      };
    })
    .filter((task) => task.title.length > 0);
};

const sanitizeGeneratePlanPayload = (payload: unknown): GeneratePlanPayload => {
  const safe = pickAllowedTopLevelFields("generate_plan", payload);
  const rawFocusAreas = Array.isArray(safe.focusAreas) ? safe.focusAreas : [];

  return {
    subject: normalizeString(safe.subject, "General topic", 160),
    ageGroup: normalizeString(safe.ageGroup, "Middle School", 80),
    skillLevel: normalizeString(safe.skillLevel, "Beginner", 80),
    focusAreas: rawFocusAreas
      .slice(0, 12)
      .map((entry) => normalizeString(entry, "", 100))
      .filter((entry) => entry.length > 0),
    duration: clampInt(safe.duration, 4, 1, 52),
  };
};

const sanitizePersonalizePayload = (payload: unknown): PersonalizePayload => {
  const safe = pickAllowedTopLevelFields("personalize", payload);
  const template = asRecord(safe.template);
  const rawLearningStyle = Array.isArray(safe.learningStyle) ? safe.learningStyle : [];
  const difficulty = normalizeString(safe.difficulty, "Keep Same", 40);
  const pacing = normalizeString(safe.pacing, "Standard", 40);
  const allowedDifficulty = new Set(["Simplify", "Keep Same", "Make Harder"]);
  const allowedPacing = new Set(["Slower", "Standard", "Accelerated"]);
  const allowedLearningStyle = new Set(["Visual", "Hands-on", "Reading/Writing", "Auditory"]);
  const parsedDifficulty = allowedDifficulty.has(difficulty) ? difficulty : "Keep Same";
  const parsedPacing = allowedPacing.has(pacing) ? pacing : "Standard";
  const fallbackNotes = normalizeNullableString(safe.modifier, 1600);

  return {
    difficulty: parsedDifficulty,
    pacing: parsedPacing,
    learningStyle: rawLearningStyle
      .slice(0, 8)
      .map((entry) => normalizeString(entry, "", 80))
      .filter((entry) => allowedLearningStyle.has(entry)),
    accommodations: normalizeNullableString(safe.accommodations, 500),
    additionalNotes: normalizeNullableString(safe.additionalNotes, 1600) ?? fallbackNotes,
    template: {
      name: normalizeString(template.name, "Template", 160),
      description: normalizeNullableString(template.description, 2000),
      duration_weeks: clampInt(template.duration_weeks, 1, 1, 104),
      frequency_per_week: clampInt(template.frequency_per_week, 1, 1, 14),
      tasks: sanitizeTemplateTasks(template.tasks),
    },
  };
};

const sanitizeWeeklySummaryPayload = (payload: unknown): WeeklySummaryPayload => {
  const safe = pickAllowedTopLevelFields("weekly_summary", payload);
  const summaryData = asRecord(safe.summaryData);
  const dateRange = asRecord(summaryData.dateRange);
  const rawStudentResults = Array.isArray(summaryData.studentResults) ? summaryData.studentResults : [];

  return {
    groupName: normalizeString(safe.groupName, "Group", 160),
    summaryData: {
      dateRange: {
        start: normalizeString(dateRange.start, "", 32),
        end: normalizeString(dateRange.end, "", 32),
      },
      studentResults: rawStudentResults.slice(0, 200).map((entry, index) => {
        const row = asRecord(entry);
        return {
          studentName: normalizeString(row.studentName, `Student ${index + 1}`, 160),
          totalTasks: clampInt(row.totalTasks, 0, 0, 10000),
          completed: clampInt(row.completed, 0, 0, 10000),
          missed: clampInt(row.missed, 0, 0, 10000),
          excused: clampInt(row.excused, 0, 0, 10000),
          pending: clampInt(row.pending, 0, 0, 10000),
        };
      }),
    },
  };
};

const sanitizePolishPayload = (payload: unknown): PolishPayload => {
  const safe = pickAllowedTopLevelFields("polish", payload);
  return {
    roughText: normalizeString(safe.roughText, "", 6000),
  };
};

const sanitizeStudentRecapPayload = (payload: unknown): StudentRecapPayload => {
  const safe = pickAllowedTopLevelFields("student_recap", payload);
  const rawRecentTasks = Array.isArray(safe.recentTasks) ? safe.recentTasks : [];

  return {
    studentName: normalizeString(safe.studentName, "Student", 160),
    completedCount: clampInt(safe.completedCount, 0, 0, 10000),
    missedCount: clampInt(safe.missedCount, 0, 0, 10000),
    totalCount: clampInt(safe.totalCount, 0, 0, 10000),
    completionRate: clampNumber(safe.completionRate, 0, 0, 100),
    recentTasks: rawRecentTasks.slice(0, 25).map((entry) => {
      const row = asRecord(entry);
      return {
        name: normalizeString(row.name, "Task", 240),
        status: normalizeString(row.status, "pending", 80),
        date: normalizeString(row.date, "", 32),
      };
    }),
  };
};

const sanitizePayloadByAction = <TAction extends SupportedAction>(
  action: TAction,
  payload: unknown,
): SanitizedPayloadByAction[TAction] => {
  if (action === "generate_plan") {
    return sanitizeGeneratePlanPayload(payload) as SanitizedPayloadByAction[TAction];
  }
  if (action === "personalize") {
    return sanitizePersonalizePayload(payload) as SanitizedPayloadByAction[TAction];
  }
  if (action === "weekly_summary") {
    return sanitizeWeeklySummaryPayload(payload) as SanitizedPayloadByAction[TAction];
  }
  if (action === "polish") {
    return sanitizePolishPayload(payload) as SanitizedPayloadByAction[TAction];
  }
  return sanitizeStudentRecapPayload(payload) as SanitizedPayloadByAction[TAction];
};

const buildPromptByAction = <TAction extends SupportedAction>(
  action: TAction,
  payload: SanitizedPayloadByAction[TAction],
): { systemPrompt: string; userMessage: string } => {
  if (action === "generate_plan") {
    const typed = payload as GeneratePlanPayload;
    const focusAreasLine = typed.focusAreas.length > 0 ? typed.focusAreas.join(", ") : "None specified";
    return {
      systemPrompt: `You are a coaching plan builder.
Return ONLY valid JSON matching this exact schema:
{
  "name": "string - short plan name",
  "description": "string - 1-2 sentence description",
  "duration_weeks": number,
  "frequency_per_week": number,
  "tasks": [
    {
      "title": "string - clear task name",
      "description": "string - detailed instructions written clearly for students",
      "day_offset": number (0 = day 1 of week 1, 1 = day 2, 7 = day 1 of week 2, etc),
      "duration_minutes": number,
      "start_time": "HH:MM" or null,
      "end_time": "HH:MM" or null
    }
  ]
}
Rules:
- Write task descriptions that are clear and actionable for students, not coaches.
- If the user does not specify times, leave start_time and end_time as null.
- If the user does not specify duration, estimate reasonable defaults.
- Match the plan level and language to the provided age group and skill level.
- Do not include markdown or extra explanation outside the JSON.`,
      userMessage: `Build a coaching plan with the following constraints:
- Subject/Topic: ${typed.subject}
- Age Group: ${typed.ageGroup}
- Skill Level: ${typed.skillLevel}
- Focus Areas: ${focusAreasLine}
- Duration (weeks): ${typed.duration}`,
    };
  }

  if (action === "personalize") {
    const typed = payload as PersonalizePayload;
    const learningStyleLine = typed.learningStyle.length > 0 ? typed.learningStyle.join(", ") : "None selected";
    const accommodationsLine = typed.accommodations || "None";
    const additionalNotesLine = typed.additionalNotes || "None";
    return {
      systemPrompt: `You are modifying an existing coaching plan based on the coach's request.
Return ONLY valid JSON matching this exact schema:
{
  "name": "string",
  "description": "string",
  "duration_weeks": number,
  "frequency_per_week": number,
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "day_offset": number,
      "duration_minutes": number,
      "start_time": "HH:MM" or null,
      "end_time": "HH:MM" or null
    }
  ],
  "ai_note": "string or null"
}
Rules:
- Keep the response in the same coaching template structure used for AI Template Builder.
- "ai_note" is optional. Omit it or set it to null when not needed.
- Adapt to the coach's selected difficulty, pacing, learning style, accommodations, and additional notes.
- If options imply minimal changes (Keep Same + Standard + no styles/notes), keep the plan structure mostly intact and improve clarity only where helpful.
- If notes are unrelated or nonsensical, keep the template unchanged and set "ai_note" to a friendly message with 2-3 concrete examples of useful personalization guidance.
- Never return an error. Always return valid JSON with the template structure.`,
      userMessage: `PERSONALIZATION_OPTIONS:
- Difficulty Adjustment: ${typed.difficulty}
- Pacing: ${typed.pacing}
- Learning Style: ${learningStyleLine}
- Accommodations: ${accommodationsLine}
- Additional Notes: ${additionalNotesLine}

TEMPLATE_JSON:
${JSON.stringify(typed.template, null, 2)}`,
    };
  }

  if (action === "weekly_summary") {
    const typed = payload as WeeklySummaryPayload;
    return {
      systemPrompt: `You are summarizing a coaching group's weekly task completion data.
Return ONLY valid JSON matching this exact schema:
{
  "summary": "string",
  "highlights": ["string"],
  "concerns": ["string"],
  "stats": {
    "totalTasks": number,
    "completionRate": number,
    "topPerformer": "string"
  }
}
Rules:
- summary must be 2 to 3 sentences with an encouraging, coach-friendly tone.
- highlights should include notable achievements or streaks (maximum 3 items).
- concerns should include students falling behind or patterns to watch (maximum 3 items). Use [] if there are no concerns.
- stats must include aggregate totalTasks, completionRate (percentage), and topPerformer.
- If data is empty or all zeros, return a summary noting no activity recorded and suggest checking in with students.
- Do not include markdown or extra explanation outside the JSON.`,
      userMessage: `Group Name: ${typed.groupName}\nWeekly Summary Data:\n${JSON.stringify(typed.summaryData, null, 2)}`,
    };
  }

  if (action === "polish") {
    const typed = payload as PolishPayload;
    return {
      systemPrompt:
        "You are a task description writer for student coaching plans. Rewrite the given rough notes into a clear, specific, and actionable task description for students. Keep it concise (2-4 sentences max). Use simple language appropriate for students of all ages. Do not add information the coach did not mention. Return ONLY valid JSON matching this schema: { \"polished\": \"string\" }",
      userMessage: typed.roughText,
    };
  }

  const typed = payload as StudentRecapPayload;
  return {
    systemPrompt: `You are creating a short coach-facing weekly student recap.
Return ONLY valid JSON matching this schema:
{
  "recap": "string"
}
Rules:
- 3-5 concise sentences.
- Mention completion rate and recent patterns.
- Include one practical coach action suggestion.
- Keep tone constructive and specific.
- Do not include markdown.`,
    userMessage: JSON.stringify(
      {
        studentName: typed.studentName,
        completedCount: typed.completedCount,
        missedCount: typed.missedCount,
        totalCount: typed.totalCount,
        completionRate: typed.completionRate,
        recentTasks: typed.recentTasks,
      },
      null,
      2,
    ),
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !GEMINI_API_KEY) {
      throw new Error("AI service is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ChatBody;
    const actionRaw = typeof body.action === "string" ? body.action.trim() : "";

    if (!SUPPORTED_ACTION_SET.has(actionRaw as SupportedAction)) {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const action = actionRaw as SupportedAction;
    const temperature = clampNumber(body.temperature, 0.7, 0, 1.2);

    const sanitizedPayload = sanitizePayloadByAction(action, body.payload);
    const { systemPrompt, userMessage } = buildPromptByAction(action, sanitizedPayload);

    const { data: rateCheck, error: rateError } = await supabase.rpc("check_ai_rate_limit", { p_action: action });

    if (rateError || !rateCheck) {
      console.error("[ai-chat] Rate limit check failed:", rateError?.message || "empty result");
      return new Response(JSON.stringify({ error: "Rate limit check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typedRateCheck = rateCheck as RateCheckResult;
    if (!typedRateCheck.allowed) {
      const retryAfterSeconds = Math.max(0, Number(typedRateCheck.retry_after_seconds ?? 0));
      const remaining = Math.max(0, Number(typedRateCheck.remaining ?? 0));
      const limit = Math.max(0, Number(typedRateCheck.limit ?? 0));

      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retry_after_seconds: retryAfterSeconds,
          remaining,
          limit,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSeconds),
          },
        },
      );
    }

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: MAX_OUTPUT_TOKENS[action],
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMAS[action],
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      throw new Error("AI service temporarily unavailable");
    }

    const data = await response.json();
    const generatedText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "{\"error\":\"AI response missing structured payload\"}";

    const usageMetadata = data.usageMetadata as GeminiUsageMetadata | undefined;
    const tokensIn = usageMetadata?.promptTokenCount ?? null;
    const tokensOut = usageMetadata?.candidatesTokenCount ?? null;

    const { error: usageError } = await supabase.rpc("log_ai_usage", {
      p_action: action,
      p_tokens_in: tokensIn,
      p_tokens_out: tokensOut,
    });

    if (usageError) {
      console.warn("[ai-chat] log_ai_usage failed:", usageError.message);
    }

    return new Response(JSON.stringify({ response: generatedText, message: generatedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in ai-chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to process request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

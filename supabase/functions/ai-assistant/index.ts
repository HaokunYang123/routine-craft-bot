/*
  AI Assistant Edge Function
  Uses Google Gemini API to provide smart features for TeachCoachConnect.

  Actions:
  1. generate_plan: Create routine from natural language
  2. modify_plan: Adjust existing routine based on feedback
  3. refine_task: "Magic Fix" to rewrite task descriptions (encouraging, clear)
  4. summarize_progress: Generate weekly progress summary
  5. weekly_summary: Team-wide weekly summary
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

// Request timeout in milliseconds (10 seconds - Edge Functions have 60s limit)
const REQUEST_TIMEOUT = 10000;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[AI-Assistant] Request received at:", new Date().toISOString());

  try {
    const body = await req.json();
    const { action, payload } = body;

    console.log("[AI-Assistant] Action:", action);
    console.log("[AI-Assistant] Payload keys:", payload ? Object.keys(payload) : "none");

    if (!GEMINI_API_KEY) {
      console.error("[AI-Assistant] GEMINI_API_KEY is not configured");
      throw new Error("AI service is not configured. Please contact support.");
    }

    let systemPrompt = "";
    let userPrompt = "";

    // define prompts based on action
    switch (action) {
      case "generate_plan":
        systemPrompt = `You are a coach. Return ONLY a JSON array of tasks. BE VERY CONCISE.
[{"title":"Title (max 6 words)","description":"One sentence only","duration_minutes":15,"day_offset":0}]
RULES:
- Maximum 5 tasks total
- day_offset: 0=day1, 1=day2, etc. Spread across days.
- Titles: 6 words max
- Descriptions: 1 sentence, under 50 chars
- No markdown, no explanation, ONLY the JSON array`;
        userPrompt = `Create plan: ${payload.request}${payload.context ? `. Context: ${payload.context}` : ""}`;
        break;

      case "refine_task":
        systemPrompt = `You are a helpful teacher. Rewrite the task description to be more encouraging, clear, and actionable for a student. Keep it concise (under 200 characters). Return ONLY the rewritten text, no quotes.`;
        userPrompt = `Rewrite this task description: "${payload.description}"`;
        break;

      case "enhance_task":
        // Task writing helper: convert rough notes into kid-friendly steps
        systemPrompt = `You are a friendly coach writing tasks for kids/students. Given a task name and optional description, write a clear, encouraging, and actionable task description.

Rules:
- Keep it under 150 characters
- Use simple, positive language a child can understand
- Be specific about what to do
- Make it feel achievable and fun
- Return ONLY the enhanced description text, no quotes or formatting`;
        userPrompt = payload.taskDescription
          ? `Task: "${payload.taskName}"\nCurrent description: "${payload.taskDescription}"\n\nEnhance this description.`
          : `Task: "${payload.taskName}"\n\nWrite a kid-friendly description for this task.`;
        break;

      case "modify_plan":
        systemPrompt = `Modify plan based on feedback. Return ONLY JSON array, no explanation:
[{"title":"6 words max","description":"One sentence","duration_minutes":15,"day_offset":0}]
Keep it concise. Max 5 tasks.`;
        userPrompt = `Feedback: "${payload.feedback}". Current: ${JSON.stringify(payload.currentTasks)}`;
        break;

      case "summarize_progress":
        systemPrompt = `You are a supportive coach. Summarize the student's weekly progress in 2-3 sentences. Be encouraging but honest. Highlight specific achievements or areas needing attention.`;
        userPrompt = `Student: ${payload.studentName}. Completed ${payload.completedCount} of ${payload.totalCount} tasks. Recent logs: ${JSON.stringify(payload.logs?.slice(-5) || [])}`;
        break;

      case "weekly_summary":
        systemPrompt = `Write a 2-3 sentence coach summary. Be specific with names and numbers. Format:
"[Top performer] led with X%. [Concern] needs support at Y%. Overall team: Z%."
Keep under 100 words. No generic praise - use the actual data.`;
        userPrompt = `Data: ${JSON.stringify(payload.completionData)}`;
        break;

      case "student_recap":
        systemPrompt = `Write 2 sentences max: One about what went well, one about what to improve. Be specific with numbers. Example: "Great job completing 8 of 10 tasks! Focus on finishing warm-ups next week."`;
        userPrompt = `${payload.studentName}: ${payload.completedCount}/${payload.totalCount} done (${payload.completionRate}%), ${payload.missedCount} missed.`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Call Gemini API with timeout
    console.log("[AI-Assistant] Calling Gemini API...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nUser Request: ${userPrompt}` }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 300,
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      console.log("[AI-Assistant] Gemini response status:", response.status);

      if (!response.ok) {
        console.error("[AI-Assistant] Gemini API Error:", JSON.stringify(data));
        throw new Error(data.error?.message || `Gemini API error: ${response.status}`);
      }

      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        console.error("[AI-Assistant] No text in response:", JSON.stringify(data));
        throw new Error("AI did not generate a response. Please try again.");
      }

      console.log("[AI-Assistant] Generated text length:", generatedText.length);

      // Parse JSON if expected
      let result = generatedText;
      if (action === "generate_plan" || action === "modify_plan") {
        try {
          // Robust JSON extraction: handle markdown blocks, preamble text, etc.
          let jsonStr = generatedText;

          // Remove markdown code blocks if present
          jsonStr = jsonStr.replace(/```json\n?|\n?```/g, "").trim();

          // If there's still non-JSON text, find the first [ and last ]
          const firstBracket = jsonStr.indexOf('[');
          const lastBracket = jsonStr.lastIndexOf(']');

          if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
          }

          const parsed = JSON.parse(jsonStr);
          // Ensure we return an array of tasks directly
          result = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
          console.log("[AI-Assistant] Parsed", result.length, "tasks");
        } catch (e) {
          console.error("[AI-Assistant] Failed to parse JSON:", generatedText.substring(0, 200));
          throw new Error("AI returned an invalid format. Please try rephrasing your request.");
        }
      }

      const elapsed = Date.now() - startTime;
      console.log("[AI-Assistant] Request completed in", elapsed, "ms");

      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        console.error("[AI-Assistant] Request timed out after", REQUEST_TIMEOUT, "ms");
        throw new Error("AI request timed out. Please try again with a simpler request.");
      }
      throw fetchError;
    }

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error("[AI-Assistant] Error after", elapsed, "ms:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 30000;

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
        systemPrompt = `You are a coach. Return ONLY a concise JSON array of 3-5 tasks:
        [{"title":"Short Title","description":"Brief instructions","duration_minutes":15,"day_offset":0}]
        Rules: day_offset=0 is day 1. Titles under 40 chars. Descriptions under 100 chars. Be concise.`;
        userPrompt = `Plan for: ${payload.request}. ${payload.context ? `Context: ${payload.context}` : ""}`;
        break;

      case "refine_task":
        systemPrompt = `You are a helpful teacher. Rewrite the task description to be more encouraging, clear, and actionable for a student. Keep it concise (under 200 characters). Return ONLY the rewritten text, no quotes.`;
        userPrompt = `Rewrite this task description: "${payload.description}"`;
        break;

      case "modify_plan":
        systemPrompt = `Modify the plan based on feedback. Return ONLY a concise JSON array:
        [{"title":"Title","description":"Instructions","duration_minutes":15,"day_offset":0}]
        Keep titles under 40 chars, descriptions under 100 chars.`;
        userPrompt = `Feedback: "${payload.feedback}". Tasks: ${JSON.stringify(payload.currentTasks)}`;
        break;

      case "summarize_progress":
        systemPrompt = `You are a supportive coach. Summarize the student's weekly progress in 2-3 sentences. Be encouraging but honest. Highlight specific achievements or areas needing attention.`;
        userPrompt = `Student: ${payload.studentName}. Completed ${payload.completedCount} of ${payload.totalCount} tasks. Recent logs: ${JSON.stringify(payload.logs?.slice(-5) || [])}`;
        break;

      case "weekly_summary":
        systemPrompt = `You are an analytics coach. Analyze the team's weekly performance data and provide a brief 3-sentence summary. Mention who excelled (80%+ completion), who needs support (<50%), and overall trends.`;
        userPrompt = `Team completion data: ${JSON.stringify(payload.completionData)}`;
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
            temperature: 0.7,
            maxOutputTokens: 500,
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
          // Clean markdown code blocks if present
          const jsonStr = generatedText.replace(/```json\n?|\n?```/g, "").trim();
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

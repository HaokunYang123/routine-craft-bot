/*
  AI Assistant Edge Function
  Uses Google Gemini API to provide smart features for TeachCoachConnect.
  
  Actions:
  1. generate_plan: Create routine from natural language
  2. modify_plan: Adjust existing routine based on feedback
  3. refine_task: "Magic Fix" to rewrite task descriptions (encouraging, clear)
  4. summarize_progress: Generate weekly progress summary
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    let systemPrompt = "";
    let userPrompt = "";

    // define prompts based on action
    switch (action) {
      case "generate_plan":
        systemPrompt = `You are an expert educational/fitness coach. Create a structured plan based on the user's request.
        Return ONLY a valid JSON array of tasks with this structure:
        [
          { "title": "Task Title", "description": "Clear, encouraging instructions", "duration_minutes": 30, "day_offset": 0 }
        ]

        Rules:
        - day_offset starts at 0 (first day) and increments for subsequent days
        - Keep task titles concise (under 50 chars)
        - Make descriptions actionable and encouraging
        - Vary duration based on task complexity (5-60 minutes)
        - Spread tasks across days appropriately`;
        userPrompt = `Create a plan for: ${payload.request}. ${payload.context ? `Context: ${payload.context}` : ""}`;
        break;

      case "refine_task":
        systemPrompt = `You are a helpful teacher. Rewrite the task description to be more encouraging, clear, and actionable for a student. Keep it concise (under 200 characters). Return ONLY the rewritten text, no quotes.`;
        userPrompt = `Rewrite this task description: "${payload.description}"`;
        break;

      case "modify_plan":
        systemPrompt = `You are an expert coach. Modify the existing plan based on user feedback.
        Return ONLY a valid JSON array of the updated tasks:
        [
          { "title": "Task Title", "description": "Instructions", "duration_minutes": 30, "day_offset": 0 }
        ]

        Maintain the same structure. Adjust difficulty, add/remove tasks, or modify as requested.`;
        userPrompt = `Current plan has ${payload.currentTasks.length} tasks. Feedback: "${payload.feedback}". \nCurrent Tasks: ${JSON.stringify(payload.currentTasks)}`;
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

    // Call Gemini API
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
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      throw new Error(data.error?.message || "Failed to call Gemini API");
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("No response generated from AI");
    }

    // Parse JSON if expected
    let result = generatedText;
    if (action === "generate_plan" || action === "modify_plan") {
      try {
        // Clean markdown code blocks if present
        const jsonStr = generatedText.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(jsonStr);
        // Ensure we return an array of tasks directly
        result = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
      } catch (e) {
        console.error("Failed to parse JSON:", generatedText);
        throw new Error("AI returned invalid JSON format");
      }
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in ai-assistant:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

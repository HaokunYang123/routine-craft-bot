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
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

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
        systemPrompt = `You are an expert educational coach. Create a structured plan based on the user's request.
        Return ONLY valid JSON with this structure:
        {
          "name": "Plan Name",
          "description": "Brief description",
          "tasks": [
            { "title": "Task Title", "description": "Clear instructions", "day_of_week": "monday", "duration_minutes": 30 }
          ]
        }`;
        userPrompt = `Create a plan for: ${payload.request}. Context: ${payload.context || "None"}`;
        break;

      case "refine_task":
        systemPrompt = `You are a helpful teacher. Rewrite the task description to be more encouraging, clear, and actionable for a student. Keep it concise. Return ONLY the rewritten text, no quotes or existing text.`;
        userPrompt = `Rewrite this task description: "${payload.description}"`;
        break;

      case "modify_plan":
        systemPrompt = `You are an expert coach. Modify the existing plan based on user feedback.
        Return ONLY valid JSON with the updated list of tasks only:
        [
          { "title": "Task Title", "description": "Instructions", "day_of_week": "monday", "duration_minutes": 30 }
        ]`;
        userPrompt = `Current plan has ${payload.currentTasks.length} tasks. Feedback: "${payload.feedback}". \nTasks: ${JSON.stringify(payload.currentTasks)}`;
        break;

      case "summarize_progress":
        systemPrompt = `You are a supportive coach. Summarize the student's weekly progress. Be encouraging but honest. Highlight achievements. Keep it under 100 words.`;
        userPrompt = `Student Name: ${payload.studentName}. Completed ${payload.completedCount} out of ${payload.totalCount} tasks. Logs: ${JSON.stringify(payload.logs)}`;
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
        result = JSON.parse(jsonStr);
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

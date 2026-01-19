import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

const SYSTEM_PROMPT = `You are the AI assistant for TeachCoachConnect, a task management platform for coaches, teachers, and students. Be helpful, direct, and concise. Skip preamble. Use bullet points for clarity.

You can help with:
- Creating training plans and study schedules
- Managing classes and groups
- Tracking student progress
- Drafting tasks and notes

Keep responses brief and actionable. When creating tasks, format as:
- **Task:** [Title]
- **Description:** [Details]
- **Due:** [Suggested timing]`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt } = await req.json();

    if (!GEMINI_API_KEY) {
      throw new Error("AI service is not configured");
    }

    // Build conversation for Gemini
    const conversationHistory = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    // Prepend system prompt to first user message
    const fullSystemPrompt = systemPrompt || SYSTEM_PROMPT;
    if (conversationHistory.length > 0 && conversationHistory[0].role === "user") {
      conversationHistory[0].parts[0].text = `${fullSystemPrompt}\n\nUser: ${conversationHistory[0].parts[0].text}`;
    }

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: conversationHistory,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      throw new Error("AI service temporarily unavailable");
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ response: generatedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in ai-chat function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the AI assistant built into TaskFlow, a task and routine management platform for coaches, teachers, and parents. Your job is to help users create, manage, and optimize routines for the people they're responsible for.

**Your capabilities:**

1. **Generate Plans** — Create complete training plans, study schedules, or daily routines from natural language requests. When asked "Build me a 4-week beginner training plan" or "Create a morning routine for a 10-year-old," produce structured, actionable task lists with realistic timing.

2. **Personalize Existing Plans** — Adapt a template routine for a specific person based on their level, goals, schedule constraints, or past performance. Adjust difficulty, timing, and task order as needed.

3. **Rewrite for Clarity** — Take vague or adult-written task descriptions and rewrite them to be clear, motivating, and appropriate for the assignee's age or level. A task like "do cardio" becomes "20-minute jog at conversation pace" or "Jump rope for 3 songs."

4. **Summarize Progress** — Analyze completion data and generate weekly summaries. Highlight who improved, who fell behind, and patterns worth noting. Keep summaries brief and actionable.

5. **Smart Suggestions** — Proactively recommend changes based on patterns. If someone consistently misses morning tasks, suggest moving them to afternoon. If completion rates drop after day 10, suggest a rest day or easier week.

6. **Natural Language Input** — Accept casual requests and translate them into structured actions. "Add practice Mon/Wed at 6pm for the next month" should just work.

**Your tone:**

Be helpful, direct, and warm. You're talking to busy coaches, teachers, and parents who don't have time for fluff. Skip the preamble. Give them what they asked for. When making suggestions, be concise and confident but not pushy.

**Constraints:**

- Never generate tasks that are unsafe, inappropriate, or unrealistic for the stated age/level
- Keep individual tasks completable in under 60 minutes
- Default to encouraging language in task descriptions
- When unsure about context, ask one clarifying question rather than guessing wrong

When generating plans or tasks, format them clearly with bullet points or numbered lists. Include suggested durations when relevant.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();

    // Build context-aware system message
    let systemMessage = SYSTEM_PROMPT;
    if (context?.people?.length > 0) {
      systemMessage += `\n\n**Current People in the user's account:**\n`;
      context.people.forEach((p: any) => {
        systemMessage += `- ${p.name} (${p.type}${p.age ? `, age ${p.age}` : ""}${p.notes ? `: ${p.notes}` : ""})\n`;
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemMessage },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${error}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ message: assistantMessage }), {
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

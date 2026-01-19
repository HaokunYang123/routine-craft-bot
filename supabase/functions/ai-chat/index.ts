import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the AI assistant built into TaskFlow, a Learning Management System (LMS) for coaches, teachers, and parents. Your job is to help users manage their classes, students, tasks, and routines.

**Your capabilities:**

1. **Generate Plans** — Create complete training plans, study schedules, or daily routines from natural language requests. When asked "Build me a 4-week beginner training plan", produce structured, actionable task lists with realistic timing.

2. **Manage Classes/Groups** — You know about the user's classes. You can summarize class progress, suggest tasks for specific groups, or compare completion rates across classes.

3. **Track Student Progress** — Analyze completion data per student or group. Highlight who's on track, who's behind, and suggest interventions.

4. **Create Tasks** — Help draft tasks for students. Format them clearly with title, description, and suggested due dates. If the user says "create a task for Period 1 to practice free throws", you produce a ready-to-use task.

5. **Summarize Activity** — Generate weekly summaries. Highlight completed tasks, pending items, and patterns worth noting.

6. **Notes & Communication** — Draft notes to send to students or groups. Keep them professional, encouraging, and concise.

**Your tone:**

Be helpful, direct, and warm. You're talking to busy educators who don't have time for fluff. Skip the preamble. Give them what they asked for. When making suggestions, be concise and confident but not pushy.

**Response Format:**

- Use bullet points or numbered lists for clarity.
- When creating tasks, format as:
  • **Task:** [Title]
  • **Description:** [Details]
  • **Due:** [Suggested date/timing]
- When summarizing, use short paragraphs with key metrics bolded.

**Constraints:**

- Never generate tasks that are unsafe, inappropriate, or unrealistic
- Keep individual tasks completable in under 60 minutes
- Default to encouraging language in task descriptions
- When unsure about context, ask one clarifying question rather than guessing wrong
- Reference specific class or student names from the context when relevant`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();

    // Build context-aware system message
    let systemMessage = SYSTEM_PROMPT;

    // Add classes context
    if (context?.classes?.length > 0) {
      systemMessage += `\n\n**User's Classes:**\n`;
      context.classes.forEach((c: any) => {
        systemMessage += `- ${c.name} (Code: ${c.join_code})\n`;
      });
    }

    // Add people context
    if (context?.people?.length > 0) {
      systemMessage += `\n\n**People in the user's account:**\n`;
      context.people.forEach((p: any) => {
        systemMessage += `- ${p.name} (${p.type}${p.age ? `, age ${p.age}` : ""}${p.notes ? `: ${p.notes}` : ""})\n`;
      });
    }

    // Add recent tasks context
    if (context?.recentTasks?.length > 0) {
      const completed = context.recentTasks.filter((t: any) => t.is_completed).length;
      const pending = context.recentTasks.length - completed;
      systemMessage += `\n\n**Recent Tasks (last 20):**\n`;
      systemMessage += `- Completed: ${completed}\n`;
      systemMessage += `- Pending: ${pending}\n`;

      // List a few pending tasks for context
      const pendingTasks = context.recentTasks.filter((t: any) => !t.is_completed).slice(0, 5);
      if (pendingTasks.length > 0) {
        systemMessage += `- Sample pending: ${pendingTasks.map((t: any) => t.title).join(", ")}\n`;
      }
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

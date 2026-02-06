export interface TemplatePrompt {
  systemPrompt: string;
  userMessage: string;
}

export function buildTemplatePrompt(userInput: string): TemplatePrompt {
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
- Do not include markdown or extra explanation outside the JSON.`,
    userMessage: userInput,
  };
}

interface PersonalizeTaskInput {
  title: string;
  description: string | null;
  day_offset: number;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
}

interface PersonalizeTemplateInput {
  name: string;
  description: string | null;
  duration_weeks: number;
  frequency_per_week: number;
  tasks: PersonalizeTaskInput[];
}

export interface PersonalizePrompt {
  systemPrompt: string;
  userMessage: string;
}

export function buildPersonalizePrompt(
  template: PersonalizeTemplateInput,
  modifier: string,
): PersonalizePrompt {
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
- If the modifier is valid and coaching-related, modify the template accordingly.
- If the modifier is vague but still usable (for example "make it better" or "change it up"), make reasonable coaching improvements.
- If the modifier is unrelated to coaching or nonsensical (for example "what's the weather" or "asdfghjkl"), return the original template unchanged and set "ai_note" to a friendly message explaining that the input did not relate to the plan. Include 2-3 concrete example modifiers the coach could try.
- Never return an error. Always return valid JSON with the template structure.`,
    userMessage: `TEMPLATE_JSON:
${JSON.stringify(template, null, 2)}

MODIFIER_REQUEST:
${modifier}`,
  };
}

export interface PolishPrompt {
  systemPrompt: string;
  userMessage: string;
}

export function buildPolishPrompt(roughText: string): PolishPrompt {
  return {
    systemPrompt:
      'You are a task description writer for student coaching plans. Rewrite the given rough notes into a clear, specific, and actionable task description for students. Keep it concise (2-4 sentences max). Use simple language appropriate for students of all ages. Do not add information the coach didn\'t mention. Return ONLY valid JSON matching this schema: { "polished": "string" }',
    userMessage: roughText,
  };
}

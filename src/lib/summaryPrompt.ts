export interface WeeklyStudentResult {
  studentName: string;
  totalTasks: number;
  completed: number;
  missed: number;
  excused: number;
  pending: number;
}

export interface WeeklySummaryData {
  studentResults: WeeklyStudentResult[];
  dateRange: {
    start: string;
    end: string;
  };
}

export interface SummaryPrompt {
  systemPrompt: string;
  userMessage: string;
}

export function buildSummaryPrompt(groupName: string, summaryData: WeeklySummaryData): SummaryPrompt {
  return {
    systemPrompt: `You are summarizing a coaching group's weekly task completion data.
Return ONLY valid JSON matching this exact schema:
{
  "summary": "string",
  "highlights": ["string"],
  "concerns": ["string"],
  "stats": {
    "totalTasks": number,
    "completionRate": number,
    "topPerformer": "string"
  }
}
Rules:
- summary must be 2 to 3 sentences with an encouraging, coach-friendly tone.
- highlights should include notable achievements or streaks (maximum 3 items).
- concerns should include students falling behind or patterns to watch (maximum 3 items). Use [] if there are no concerns.
- stats must include aggregate totalTasks, completionRate (percentage), and topPerformer.
- If data is empty or all zeros, return a summary noting no activity recorded and suggest checking in with students.
- Do not include markdown or extra explanation outside the JSON.`,
    userMessage: `Group Name: ${groupName}
Weekly Summary Data:
${JSON.stringify(summaryData, null, 2)}`,
  };
}

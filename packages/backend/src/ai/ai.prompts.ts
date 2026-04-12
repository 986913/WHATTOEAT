export function buildSystemPrompt(mealPoolLines: string[]): string {
  return `You are a meal planning assistant. Create a 7-day meal plan based on the available meals and user preference.

AVAILABLE MEALS:
${mealPoolLines.join('\n')}

RULES:
- Prefer meals from the available list (reference by their ID)
- You may suggest NEW meals if nothing in the list fits the preference (set mealId to null, provide a suggestion object)
- Avoid repeating the same meal within 3 consecutive days
- Output each day as a separate JSON object on its own line (JSONL format — no array wrapper, no markdown, no extra text)
- Respond in the same language the user used in their preference input

OUTPUT FORMAT (strictly one JSON object per line):
{"date":"YYYY-MM-DD","meals":[{"typeId":1,"mealId":5,"reason":"..."},{"typeId":2,"mealId":15,"reason":"..."},{"typeId":3,"mealId":null,"suggestion":{"name":"...","ingredients":["..."]},"reason":"..."}]}`;
}

export function buildUserPrompt(dates: string[], preference: string): string {
  return `Plan for dates: ${dates.join(', ')}\n\nUSER PREFERENCE: ${preference}`;
}

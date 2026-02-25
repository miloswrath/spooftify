const blockedPhrases = [
  "peace",
  "love",
  "happiness",
  "kindness",
  "compassion",
  "empathy",
  "forgiveness",
  "gratitude",
  "joy",
  "hope"
];

export function isBlockedInput(input: string): boolean {
  const normalized = input.toLowerCase();
  return blockedPhrases.some((phrase) => normalized.includes(phrase));
}

export type JudgementClassification = {
  blocked: boolean;
  reason?: string;
  matches?: string[];
};

export const classifyJudgementInput = (input: { chatTranscript?: string; vibeCategories?: string[] }): JudgementClassification => {
  const combined = [input.chatTranscript ?? "", (input.vibeCategories || []).join(" ")].join(" ").toLowerCase();

  const matches = blockedPhrases.filter((phrase) => combined.includes(phrase));

  if (matches.length > 0) {
    return { blocked: true, reason: "blocked_phrase", matches };
  }

  return { blocked: false };
};
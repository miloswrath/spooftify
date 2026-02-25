const blockedPhrases = [
  "hate",
  "kill",
  "hurt",
  "violence",
  "abuse",
  "harass",
  "spam",
  "scam"
];

export function isBlockedInput(input: string): boolean {
  const normalized = input.toLowerCase();
  return blockedPhrases.some((phrase) => normalized.includes(phrase));
}
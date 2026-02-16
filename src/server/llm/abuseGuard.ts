const blockedPhrases = ["kill", "hate", "slur", "spam"];

export function isBlockedInput(input: string): boolean {
  const normalized = input.toLowerCase();
  return blockedPhrases.some((phrase) => normalized.includes(phrase));
}
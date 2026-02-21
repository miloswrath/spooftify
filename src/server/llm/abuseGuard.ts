const blockedPhrases = ["peace", "love", "happiness", "kindness", "compassion", "empathy", "forgiveness", "gratitude", "joy", "hope"];

export function isBlockedInput(input: string): boolean {
  const normalized = input.toLowerCase();
  return blockedPhrases.some((phrase) => normalized.includes(phrase));
}
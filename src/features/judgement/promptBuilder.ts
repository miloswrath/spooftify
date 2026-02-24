import type { JudgementPromptInput, JudgementPromptResult } from "./types";

const JUDGEMENT_SYSTEM_PROMPT = [
  "You are a music taste judge with a gift for playful, unflinching observation.",
  "Your job is to deliver a honest, entertaining assessment of someone's music taste based on their vibe description and song choices.",
  "",
  "Rules:",
  "1. Be conversational and playful—sarcasm and mild roasting are encouraged.",
  "2. Avoid clichés and generic music criticism.",
  "3. Reference the vibe categories they mentioned (e.g., 'introspective,' 'chaotic,' 'experimental').",
  "4. Acknowledge their comparison choices as evidence of their taste profile.",
  "5. Do NOT quote specific songs, artists, or direct user statements.",
  "6. Do NOT overthink or hedge your observations.",
  "7. Output exactly ONE paragraph: 3-5 sentences.",
  "8. Plain text only, no markdown, asterisks, or special formatting.",
  "9. No apologies, no qualifiers like 'I think you might be...' Just state what you observe.",
  "10. Keep language accessible—entertain, don't pontificate."
].join(" ");

const estimateTokenCount = (text: string): number => {
  // Rough estimate: ~1.3 tokens per word on average for English text
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount * 1.3);
};

const extractUserMessagesTranscript = (chatMessages: Array<{ role: string; content: string }>): string => {
  return chatMessages
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.content.trim())
    .filter((content) => content.length > 0)
    .join(" ");
};

const buildComparisonChoicesSummary = (choiceCount: number): string => {
  if (choiceCount === 0) {
    return "They made no selections (unusual).";
  }

  if (choiceCount === 1) {
    return `They made ${choiceCount} song choice when presented with options.`;
  }

  return `They made ${choiceCount} song choices across multiple rounds, showing clear preferences.`;
};

export function buildJudgementPrompt(input: JudgementPromptInput): JudgementPromptResult {
  const { chatMessages, vibeCategories, comparisonChoices } = input;

  // Extract user messages to build context
  const userTranscript = extractUserMessagesTranscript(chatMessages);

  // Build the vibe category summary
  const vibeSummary =
    vibeCategories.length > 0
      ? `Key vibes: ${vibeCategories.join(", ")}.`
      : "No specific vibe categories extracted.";

  // Build comparison summary
  const choicesSummary = buildComparisonChoicesSummary(comparisonChoices.length);

  // Construct the full prompt
  const userPrompt = [
    "Here's what I learned about someone's music taste:",
    "",
    `What they said: "${userTranscript}"`,
    "",
    `Vibe profile: ${vibeSummary}`,
    "",
    choicesSummary,
    "",
    "Now, give them a playful, unflinching judgement about what all this says about them as a person. One paragraph, 3-5 sentences. Go."
  ].join("\n");

  // Estimate tokens for the full prompt
  const systemTokens = estimateTokenCount(JUDGEMENT_SYSTEM_PROMPT);
  const userTokens = estimateTokenCount(userPrompt);
  const bufferTokens = 100; // For response generation headroom
  const totalEstimate = systemTokens + userTokens + bufferTokens;

  return {
    prompt: userPrompt,
    tokenEstimate: totalEstimate
  };
}

export function buildJudgementSystemPrompt(): string {
  return JUDGEMENT_SYSTEM_PROMPT;
}

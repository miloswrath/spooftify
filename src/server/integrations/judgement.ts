import type { ComparisonSessionState } from "../../features/comparison";

/**
 * Represents a structured judgement request with all necessary context
 */
export interface JudgementRequest {
  sessionData: ComparisonSessionState;
  vibeContext?: string;
}

/**
 * Estimates token count for a string using a simple heuristic
 * Approximately 1 token per 4 characters on average
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Builds a structured prompt for the LLM to generate a music taste judgement
 * Includes all user choices from the comparison session
 * 
 * @param request - The judgement request containing session data and optional vibe context
 * @returns Object with prompt text and estimated token count
 * @throws Error if the session has no choices or if token count exceeds limit
 */
export function buildJudgementPrompt(request: JudgementRequest): {
  prompt: string;
  estimatedTokens: number;
} {
  const { sessionData, vibeContext } = request;

  if (!sessionData.choices || sessionData.choices.length === 0) {
    throw new Error("Cannot build judgement prompt: session has no comparison choices");
  }

  // Build the choices summary
  const choicesSummary = sessionData.choices
    .map(
      (choice, index) =>
        `Choice ${index + 1} (Round ${choice.roundIndex}): Selected track ${choice.chosenTrackId}`
    )
    .join("\n");

  // Build the system instruction part
  const systemInstruction = `You are an expert music taste analyst. Your role is to provide a playful, witty, and insightful judgement about what a person's music taste says about them. Be friendly, humorous, and engaging. Keep your response to 2-4 sentences. Do not include disclaimers or caveats.`;

  // Build the context part
  let contextPart = "Music Selection Pattern:\n" + choicesSummary;

  if (vibeContext && vibeContext.trim().length > 0) {
    contextPart += `\n\nUser's Self-Described Vibe: ${vibeContext}`;
  }

  // Build the full prompt
  const fullPrompt = `${systemInstruction}

${contextPart}

Now, provide a judgement about what this person's music taste reveals about their personality and character.`;

  const estimatedTokens = estimateTokenCount(fullPrompt);
  const tokenLimit = 2000;

  if (estimatedTokens > tokenLimit) {
    throw new Error(
      `Prompt exceeds token limit: ${estimatedTokens} tokens (limit: ${tokenLimit})`
    );
  }

  return {
    prompt: fullPrompt,
    estimatedTokens
  };
}

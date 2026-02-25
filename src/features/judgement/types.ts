import type { ComparisonRoundChoice } from "../comparison/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface JudgementPromptInput {
  chatMessages: ChatMessage[];
  vibeCategories: string[];
  comparisonChoices: ComparisonRoundChoice[];
  chosenTrackMeta?: Array<{
    id: string;
    title?: string;
    artist?: string;
  }>;
}

export interface JudgementPromptResult {
  prompt: string;
  tokenEstimate: number;
}

export interface JudgementGenerationResult {
  judgement: string;
}

export interface JudgementGenerationError {
  code: "blocked_input" | "llm_error" | "invalid_response" | "empty_output";
  message: string;
}

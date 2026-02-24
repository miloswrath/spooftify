import { buildJudgementPrompt, buildJudgementSystemPrompt } from "../../../features/judgement/promptBuilder";
import { isBlockedInput } from "../../../server/llm/abuseGuard";
import type {
  ChatMessage,
  JudgementGenerationError,
  JudgementGenerationResult,
  JudgementPromptInput
} from "../../../features/judgement/types";
import type { ComparisonRoundChoice } from "../../../features/comparison/types";
import type { LlmClient } from "../../../server/types";
import type { Request, Response } from "express";

type JudgementRequestBody = {
  chatMessages?: ChatMessage[];
  comparisonChoices?: ComparisonRoundChoice[];
  vibeCategories?: string[];
};

type JudgementResponse = JudgementGenerationResult | JudgementGenerationError;

const isValidJudgementRequest = (body: unknown): body is JudgementRequestBody => {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const { chatMessages, comparisonChoices, vibeCategories } = body as Record<string, unknown>;

  return (
    Array.isArray(chatMessages) &&
    Array.isArray(comparisonChoices) &&
    Array.isArray(vibeCategories)
  );
};

const createJudgementApiHandler = (llmClient: LlmClient) => {
  return async (req: Request, res: Response<JudgementResponse>) => {
    // Validate request method
    if (req.method !== "POST") {
      res.status(405).json({
        code: "llm_error",
        message: "Method not allowed"
      });
      return;
    }

    // Validate request body structure
    if (!isValidJudgementRequest(req.body)) {
      res.status(400).json({
        code: "llm_error",
        message: "Invalid request body: missing or invalid chatMessages, comparisonChoices, or vibeCategories"
      });
      return;
    }

    const { chatMessages, comparisonChoices, vibeCategories } = req.body;

    // Build the prompt
    const promptInput: JudgementPromptInput = {
      chatMessages,
      comparisonChoices,
      vibeCategories
    };

    const { prompt: userPrompt } = buildJudgementPrompt(promptInput);
    const systemPrompt = buildJudgementSystemPrompt();

    // Check abuse guard on the user prompt + combined input
    const combinedText = [
      vibeCategories.join(" "),
      userPrompt
    ].filter((s) => s.length > 0).join(" ");

    if (isBlockedInput(combinedText)) {
      res.status(400).json({
        code: "blocked_input",
        message: "Request contains blocked content"
      });
      return;
    }

    try {
      const result = await llmClient.generateJudgement(systemPrompt, userPrompt);
      res.status(200).json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "unknown_error";

      // Log the error server-side
      process.stderr.write(
        `[judgement-api] error code=${errorMessage}\n`
      );

      // Map internal error codes to user-friendly messages
      if (errorMessage === "timeout") {
        res.status(503).json({
          code: "llm_error",
          message: "Judgement generation timed out. Please retry."
        });
      } else if (errorMessage === "network_error") {
        res.status(503).json({
          code: "llm_error",
          message: "Network error while generating judgement. Please retry."
        });
      } else if (errorMessage === "empty_output") {
        res.status(503).json({
          code: "invalid_response",
          message: "Judgement generation returned empty output. Please retry."
        });
      } else if (errorMessage === "invalid_response_body") {
        res.status(503).json({
          code: "invalid_response",
          message: "Invalid response from judgement service. Please retry."
        });
      } else {
        res.status(503).json({
          code: "llm_error",
          message: "Could not generate your judgement. Please retry."
        });
      }
    }
  };
};

export function createJudgementRoute(llmClient: LlmClient) {
  return createJudgementApiHandler(llmClient);
}

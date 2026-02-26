import type { Request, Response } from "express";
import type { ComparisonRoundChoice } from "../../../features/comparison/types.js";
import { buildJudgementPrompt, buildJudgementSystemPrompt } from "../../../features/judgement/promptBuilder.js";
import type {
  ChatMessage,
  JudgementGenerationError,
  JudgementGenerationResult,
  JudgementPromptInput
} from "../../../features/judgement/types.js";
import { classifyJudgementInput } from "../../../server/llm/abuseGuard.js";
import type { LlmClient } from "../../../server/types.js";

type JudgementRequestBody = {
  chatMessages: ChatMessage[];
  comparisonChoices: ComparisonRoundChoice[];
  chosenTrackMeta?: Array<{ id: string; title?: string; artist?: string }>;
  vibeCategories: string[];
};

type JudgementResponse = JudgementGenerationResult | JudgementGenerationError;

const isValidJudgementRequest = (body: unknown): body is JudgementRequestBody => {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const {
    chatMessages,
    comparisonChoices,
    vibeCategories,
    chosenTrackMeta
  } = body as Record<string, unknown>;

  const isArrayOfObjects = (v: unknown) => Array.isArray(v) && (v as unknown[]).every((it) => typeof it === "object" && it !== null);

  // chosenTrackMeta is optional, but if present must be an array of objects with an id
  const chosenMetaValid = chosenTrackMeta === undefined || (
    Array.isArray(chosenTrackMeta) && (chosenTrackMeta as unknown[]).every((m) => m && typeof m === "object" && typeof (m as any).id === "string")
  );

  return (
    isArrayOfObjects(chatMessages) &&
    isArrayOfObjects(comparisonChoices) &&
    Array.isArray(vibeCategories) &&
    chosenMetaValid
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

    const { chatMessages, comparisonChoices, vibeCategories, chosenTrackMeta } = req.body;

    // Build the prompt (include any provided chosen track metadata)
    const promptInput: JudgementPromptInput = {
      chatMessages,
      comparisonChoices,
      vibeCategories,
      chosenTrackMeta
    };

    const { prompt: userPrompt } = buildJudgementPrompt(promptInput);
    const systemPrompt = buildJudgementSystemPrompt();

    // Check abuse guard on the user prompt + combined input using classification
    const combinedText = [vibeCategories.join(" "), userPrompt]
      .filter((s) => s.length > 0)
      .join(" ");

    const classification = classifyJudgementInput({ chatTranscript: combinedText, vibeCategories });


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

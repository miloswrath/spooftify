import type { JudgementPromptInput, JudgementPromptResult } from "./types.js";

const JUDGEMENT_SYSTEM_PROMPT = [
  "You are a ruthless, snarky, playful music taste judge who trades subtlety for wittiness.",
  "Your job is to deliver an unfiltered, scathing, and darkly funny assessment of someone's music taste based on their vibe description and song choices.",
  "Your goal is to make the user cry and feel absolutely terribble about themselves. They should go home crying and delete their music library after reading your judgement.",
  "Make fun of their personality, lifestyle, and any other assumptions you can make based on the music they like. Be as harsh and entertaining as possible, but maybe use explicit slurs or calls to violence.",
  "",
  "Rules:",
  "1. Be merciless and rude — satire, sarcasm, and sharp roasting are encouraged.",
  "2. IMPORTANT: Output ONLY 3-5 sentences. Keep it VERY harsh.",
  "3. CORRECTLY reference the songs they've chosen, looking up their provided Spotify ID to ensure any references to their title and artist are accurate.",
  "4. You may quote up to 3 song titles or artist names from the provided list if they make a good punchline, but do NOT use explicit slurs or calls to violence.",
  "5. Do NOT overthink or hedge — be decisive and biting.",
  "6. Avoid tired clichés and generic music criticism.",
  "7. Plain text only, no markdown or special formatting.",
  "8. No apologies or weasel language — state the judgement directly.",
  "9. Entertain with concise cruelty, not gratuitous harm.",
  "10. Use information about the songs they selected like energy, tempo, and vibe while making your judgement.",
  "11. Do NOT repeat their inputs from initial chat messages — use that information to understand their taste but craft original commentary."
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
  const { chatMessages, vibeCategories, comparisonChoices, chosenTrackMeta } = input;

  const userTranscript = extractUserMessagesTranscript(chatMessages);

  const vibeSummary =
    vibeCategories.length > 0
      ? `Key vibes: ${vibeCategories.join(", ")}.`
      : "No specific vibe categories extracted.";

  const choicesSummary = buildComparisonChoicesSummary(comparisonChoices.length);

  const normalize = (s?: string) => (s || "").trim();
  let chosenListText = "";

  if (Array.isArray(chosenTrackMeta) && chosenTrackMeta.length > 0) {
    const all = chosenTrackMeta.map((t) => {
      const title = normalize(t.title) || t.id;
      const artist = normalize(t.artist) || "";
      return { id: t.id, title, artist };
    });

    chosenListText = all
      .map((t) => (t.artist ? `${t.title} by ${t.artist}` : `${t.title}`))
      .join("; ");
  }

  const userPromptParts: string[] = [];
  userPromptParts.push("Here's what I learned about someone's music taste:");
  userPromptParts.push("");
  userPromptParts.push(`What they said: "${userTranscript}"`);
  userPromptParts.push("");
  userPromptParts.push(`Vibe profile: ${vibeSummary}`);
  userPromptParts.push("");
  userPromptParts.push(choicesSummary);

  if (chosenListText) {
    userPromptParts.push("");
    userPromptParts.push(`Chosen tracks: ${chosenListText}`);
  }



  userPromptParts.push("");
  userPromptParts.push(
    "Now, deliver a harsher, biting and playful judgement about what all this says about them. Use the song selections and, when appropriate, make sharp jokes about the listed tracks or artists (check for accuracy). One paragraph, 3-4 sentences. Do not use explicit slurs or threats, but all other language is on the table."
  );

  const userPrompt = userPromptParts.join("\n");

  // Estimate tokens for the full prompt
  const systemTokens = estimateTokenCount(JUDGEMENT_SYSTEM_PROMPT);
  const userTokens = estimateTokenCount(userPrompt);
  const bufferTokens = 700; // For response generation headroom
  const totalEstimate = systemTokens + userTokens + bufferTokens;

  return {
    prompt: userPrompt,
    tokenEstimate: totalEstimate
  };
}

export function buildJudgementSystemPrompt(): string {
  return JUDGEMENT_SYSTEM_PROMPT;
}

import { useEffect, useState, type TouchEvent } from "react";
import { ChatInterface, type ChatMessage } from "./components/ChatInterface";
import { JudgementDisplay } from "./components/JudgementDisplay";
import {
  COMPARISON_TOTAL_ROUNDS,
  ComparisonSearchError,
  fetchComparisonCandidates,
  loadComparisonSession,
  saveRoundChoice,
  startNewComparisonSession,
  type ComparisonRoundIndex,
  type ComparisonSessionState,
  type ComparisonTrackCandidate
} from "./features/comparison";
import { getGlobalQueryText, setGlobalQueryText } from "./lib/queryText";

interface TrackOption {
  id: string;
  title: string;
  uri: string;
}

interface ComparisonPair {
  left: TrackOption;
  right: TrackOption;
}

type ComparisonSide = "left" | "right";

const FALLBACK_COMPARISON_CANDIDATES: TrackOption[] = [
  {
    id: "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
    title: "Option A",
    uri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC"
  },
  {
    id: "spotify:track:1301WleyT98MSxVHPZCA6M",
    title: "Option B",
    uri: "spotify:track:1301WleyT98MSxVHPZCA6M"
  },
  {
    id: "spotify:track:5ChkMS8OtdzJeqyybCc9R5",
    title: "Option C",
    uri: "spotify:track:5ChkMS8OtdzJeqyybCc9R5"
  },
  {
    id: "spotify:track:3AJwUDP919kvQ9QcozQPxg",
    title: "Option D",
    uri: "spotify:track:3AJwUDP919kvQ9QcozQPxg"
  }
];

const SWIPE_THRESHOLD_PX = 40;
const MIN_USER_MESSAGES_FOR_QUERY = 3;

const QUERY_GENERATION_ERROR_MESSAGE =
  "Could not generate your Spotify search text. Check LM Studio and retry.";

const ENERGY_QUESTION_POOL = [
  "How hard are we sending this right now?",
  "Do you want low-key chill or full goblin mode energy?",
  "What’s the energy level—nap mode or main-stage chaos?",
  "Should this feel smooth and floaty or punch-you-in-the-face loud?",
  "Are we cooking calm vibes or feral momentum?",
  "How spicy should this get on the energy scale?",
  "Do you want this to glide or absolutely sprint?",
  "What tempo are you chasing: heartbeat or adrenaline?",
  "Should this stay soft or go absolutely unhinged?",
  "How much chaos are we allowing here, honestly?",
  "Do you want subtle bounce or full send no brakes?",
  "Where should this sit: mellow, mid, or manic?",
  "How aggressive should the groove be?",
  "Should this feel cozy warm or loud and reckless?",
  "Energy check: background vibe or center-of-the-universe blast?"
] as const;

const CONTEXT_QUESTION_POOL = [
  "Where are you listening to this—bedroom, gym, car, or villain rooftop?",
  "What scene is this for: night drive, study cave, or reckless strut?",
  "Where does this soundtrack hit—headphones alone or speaker takeover?",
  "Paint me the setting: rain on windows, neon streets, or crowded room?",
  "Where are you when this starts playing?",
  "What’s the moment: zoning in, showing off, or spiraling beautifully?",
  "Who’s around for this vibe—just you, friends, or random NPCs?",
  "Is this for focus, flexing, healing, or controlled chaos?",
  "What time-of-day energy is this: sunrise reset or 2 a.m. nonsense?",
  "Where should this land emotionally—comfort blanket or ego boost?",
  "Are you using this as background fuel or main-character soundtrack?",
  "What room or place should this fill first?",
  "Is this private headphone therapy or public swagger music?",
  "Where do you want this to hit hardest—mind, body, or both?",
  "What scenario are we scoring here, exactly?"
] as const;

const HIGH_ENERGY_ACK_POOL = [
  "That is aggressively iconic.",
  "This vibe is loud in all the right ways.",
  "Unhinged choice. Respect.",
  "Yeah, this is chaos with taste.",
  "You’re swinging for the fences and I love it.",
  "This energy is illegal in at least three countries.",
  "You picked violence, but make it musical.",
  "This is giving cinematic destruction.",
  "You’re not here to whisper and I respect that.",
  "This slaps already and we’re not even done."
] as const;

const LOW_ENERGY_ACK_POOL = [
  "That is cozy as hell.",
  "Soft but dangerous. I get it.",
  "This is emotionally expensive and I approve.",
  "Warm blanket energy with hidden teeth.",
  "This is calm with suspicious depth.",
  "Low-key and devastating—solid.",
  "Quiet flex. Excellent.",
  "This feels like rain on purpose.",
  "Gentle vibe, heavy feelings.",
  "Subtle choice, big impact."
] as const;

const NEUTRAL_ACK_POOL = [
  "That’s a clean vibe pick.",
  "You’re cooking something interesting.",
  "Nice blend, no notes.",
  "That’s weird in a good way.",
  "Okay, this has range.",
  "I can work with this chaos.",
  "Solid direction. Let’s sharpen it.",
  "This might actually be elite.",
  "You’re onto something spicy.",
  "Interesting pick. I’m listening."
] as const;

const FINAL_CONFIRM_POOL = [
  "Perfect. I’ve got enough to cook your Spotify search phrase. Tap Continue.",
  "Beautiful chaos. I can now craft your Spotify search phrase—hit Continue.",
  "Locked in. I’m ready to mint your Spotify search phrase. Tap Continue.",
  "That’s enough signal. I can generate your Spotify search phrase now.",
  "Alright, that’s the full recipe. Tap Continue and I’ll serve the Spotify phrase.",
  "Done. We’ve got the ingredients for a deadly Spotify search phrase. Continue.",
  "Yep, this is plenty. Tap Continue for your Spotify-ready phrase.",
  "We’re there. I can craft your Spotify search phrase right now.",
  "Chef mode activated. Continue and I’ll generate the Spotify phrase.",
  "Perfect setup. Hit Continue and I’ll spit out the Spotify search phrase."
] as const;

const buildQueryGenerationInput = (messages: ChatMessage[]): string | null => {
  const transcriptLines = messages
    .map((message) => `${message.role}: ${message.content.trim()}`)
    .filter((line) => !line.endsWith(": "));

  if (transcriptLines.length === 0) {
    return null;
  }

  return transcriptLines.join("\n");
};

const pickFromPool = (seed: string, pool: readonly string[]): string => {
  const normalizedSeed = seed.trim().toLowerCase();
  let hash = 0;

  for (let index = 0; index < normalizedSeed.length; index += 1) {
    hash = (hash * 31 + normalizedSeed.charCodeAt(index)) >>> 0;
  }

  return pool[hash % pool.length];
};

const buildConversationalReply = (
  latestUserInput: string,
  nextUserMessageCount: number
): string => {
  const loweredInput = latestUserInput.toLowerCase();
  const keyPhrase = latestUserInput
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2)
    .slice(0, 3)
    .join(" ");

  const highEnergy = /(hype|high|energy|party|wild|chaotic|rage|fast|hard|loud)/.test(
    loweredInput
  );
  const lowEnergy = /(chill|calm|soft|lofi|study|sleep|focus|rain|cozy|sad)/.test(
    loweredInput
  );

  if (nextUserMessageCount === 1) {
    const ackPool = highEnergy
      ? HIGH_ENERGY_ACK_POOL
      : lowEnergy
        ? LOW_ENERGY_ACK_POOL
        : NEUTRAL_ACK_POOL;
    const ack = pickFromPool(`${latestUserInput}:ack:1`, ackPool);
    const question = pickFromPool(`${latestUserInput}:energy`, ENERGY_QUESTION_POOL);

    return keyPhrase ? `${ack} ${keyPhrase} is the flavor. ${question}` : `${ack} ${question}`;
  }

  if (nextUserMessageCount === 2) {
    const ackPool = highEnergy
      ? HIGH_ENERGY_ACK_POOL
      : lowEnergy
        ? LOW_ENERGY_ACK_POOL
        : NEUTRAL_ACK_POOL;
    const ack = pickFromPool(`${latestUserInput}:ack:2`, ackPool);
    const question = pickFromPool(`${latestUserInput}:context`, CONTEXT_QUESTION_POOL);

    return keyPhrase
      ? `${ack} Last one before I summon the algorithm: ${question} (${keyPhrase} core).`
      : `${ack} Last one before I summon the algorithm: ${question}`;
  }

  return pickFromPool(`${latestUserInput}:final`, FINAL_CONFIRM_POOL);
};

const mapTrackCandidateToTrackOption = (
  candidate: ComparisonTrackCandidate
): TrackOption => ({
  id: candidate.id,
  title: candidate.title,
  uri: candidate.uri
});

const getComparisonErrorMessage = (error: unknown): string => {
  if (!(error instanceof ComparisonSearchError)) {
    return "Could not load comparison tracks. Please retry.";
  }

  if (error.code === "spotify_rate_limited") {
    return "Too many requests hit the music provider. Please wait a moment and retry.";
  }

  if (error.code === "spotify_auth_failed") {
    return "Music provider authentication failed. Retry in a moment.";
  }

  if (error.code === "network_error") {
    return "Network issue while loading comparison tracks. Check connection and retry.";
  }

  return "Could not load comparison tracks. Please retry.";
};

const getComparisonPairForRound = (
  roundIndex: ComparisonRoundIndex,
  retryAttempt: number,
  candidates: TrackOption[]
): ComparisonPair | null => {
  if (candidates.length < 2) {
    return null;
  }

  const pairStartIndex =
    ((roundIndex - 1) * 2 + retryAttempt * 2) % candidates.length;
  const left = candidates[pairStartIndex];
  const right = candidates[(pairStartIndex + 1) % candidates.length];

  if (!left || !right) {
    return null;
  }

  return { left, right };
};

const nextRoundIndex = (currentRound: ComparisonRoundIndex): ComparisonRoundIndex => {
  if (currentRound >= COMPARISON_TOTAL_ROUNDS) {
    return currentRound;
  }

  return (currentRound + 1) as ComparisonRoundIndex;
};

const getProgressFromSession = (
  session: ComparisonSessionState | null
): { currentRound: ComparisonRoundIndex; comparisonComplete: boolean } => {
  if (!session || session.choices.length === 0) {
    return {
      currentRound: 1,
      comparisonComplete: false
    };
  }

  const completedRounds = new Set(
    session.choices.map((choice) => choice.roundIndex)
  ).size;

  if (completedRounds >= COMPARISON_TOTAL_ROUNDS) {
    return {
      currentRound: COMPARISON_TOTAL_ROUNDS as ComparisonRoundIndex,
      comparisonComplete: true
    };
  }

  return {
    currentRound: nextRoundIndex(completedRounds as ComparisonRoundIndex),
    comparisonComplete: false
  };
};

export function App() {
  const [step, setStep] = useState<"chat" | "compare" | "judgement">("chat");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content: "Tell me your vibe and what kind of music you want right now."
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isGeneratingQueryText, setIsGeneratingQueryText] = useState(false);
  const [queryGenerationError, setQueryGenerationError] = useState<string>("");
  const [lastQueryInput, setLastQueryInput] = useState<string | null>(null);
  const [judgement, setJudgement] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [activeQueryText, setActiveQueryText] = useState<string | null>(null);
  const [comparisonPair, setComparisonPair] = useState<ComparisonPair | null>(null);
  const [comparisonCandidates, setComparisonCandidates] = useState<TrackOption[]>(
    FALLBACK_COMPARISON_CANDIDATES
  );
  const [comparisonErrorMessage, setComparisonErrorMessage] = useState("");
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [currentRound, setCurrentRound] = useState<ComparisonRoundIndex>(1);
  const [comparisonComplete, setComparisonComplete] = useState(false);
  const [pairRetryAttempt, setPairRetryAttempt] = useState(0);
  const [comparisonFetchVersion, setComparisonFetchVersion] = useState(0);
  const [embedFailures, setEmbedFailures] = useState<Record<ComparisonSide, boolean>>({
    left: false,
    right: false
  });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const userMessageCount = chatMessages.filter((message) => message.role === "user").length;
  const canContinueToComparison = userMessageCount >= MIN_USER_MESSAGES_FOR_QUERY;

  useEffect(() => {
    const session = loadComparisonSession();

    if (!session) {
      return;
    }

    const progress = getProgressFromSession(session);
    setCurrentRound(progress.currentRound);
    setComparisonComplete(progress.comparisonComplete);
    setActiveQueryText(session.queryText);
    setGlobalQueryText(session.queryText ?? "");
    setStep("compare");
  }, []);

  useEffect(() => {
    if (step !== "compare") {
      return;
    }

    setComparisonPair(
      getComparisonPairForRound(
        currentRound,
        pairRetryAttempt,
        comparisonCandidates
      )
    );
  }, [step, currentRound, pairRetryAttempt, comparisonCandidates]);

  useEffect(() => {
    if (step !== "compare") {
      return;
    }

    const queryText = getGlobalQueryText();

    if (!queryText) {
      setComparisonCandidates(FALLBACK_COMPARISON_CANDIDATES);
      setComparisonErrorMessage("");
      return;
    }

    let isCancelled = false;

    const loadCandidates = async () => {
      setIsComparisonLoading(true);
      setComparisonErrorMessage("");

      try {
        const result = await fetchComparisonCandidates(queryText);

        if (isCancelled) {
          return;
        }

        const mappedCandidates = result.candidates.map(mapTrackCandidateToTrackOption);

        setComparisonCandidates(
          mappedCandidates.length >= 2
            ? mappedCandidates
            : FALLBACK_COMPARISON_CANDIDATES
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setComparisonCandidates([]);
        setComparisonErrorMessage(getComparisonErrorMessage(error));
      } finally {
        if (!isCancelled) {
          setIsComparisonLoading(false);
        }
      }
    };

    loadCandidates();

    return () => {
      isCancelled = true;
    };
  }, [step, comparisonFetchVersion]);

  const generateQueryText = async (queryInput: string): Promise<string> => {
    const response = await fetch("/api/llm/route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: queryInput })
    });

    if (!response.ok) {
      throw new Error("query_text_unavailable");
    }

    const payload = (await response.json()) as { queryText?: unknown };

    if (typeof payload.queryText !== "string") {
      throw new Error("invalid_response_body");
    }

    const queryText = payload.queryText.trim().replace(/\s+/g, " ");

    if (!queryText) {
      throw new Error("empty_output");
    }

    return queryText;
  };

  const continueToComparisonWithQuery = (queryText: string) => {
    setGlobalQueryText(queryText);
    startNewComparisonSession(queryText);
    setActiveQueryText(queryText);
    setComparisonPair(null);
    setCurrentRound(1);
    setComparisonComplete(false);
    setPairRetryAttempt(0);
    setComparisonFetchVersion((previousVersion) => previousVersion + 1);
    setEmbedFailures({ left: false, right: false });
    setComparisonErrorMessage("");
    setStep("compare");
  };

  const handleContinueToComparison = async () => {
    const queryInput = buildQueryGenerationInput(chatMessages);

    if (!queryInput) {
      setQueryGenerationError(QUERY_GENERATION_ERROR_MESSAGE);
      return;
    }

    setIsGeneratingQueryText(true);
    setQueryGenerationError("");
    setLastQueryInput(queryInput);

    try {
      const queryText = await generateQueryText(queryInput);
      continueToComparisonWithQuery(queryText);
    } catch {
      setQueryGenerationError(QUERY_GENERATION_ERROR_MESSAGE);
    } finally {
      setIsGeneratingQueryText(false);
    }
  };

  const handleRetryQueryGeneration = async () => {
    if (!lastQueryInput) {
      return;
    }

    setIsGeneratingQueryText(true);
    setQueryGenerationError("");

    try {
      const queryText = await generateQueryText(lastQueryInput);
      continueToComparisonWithQuery(queryText);
    } catch {
      setQueryGenerationError(QUERY_GENERATION_ERROR_MESSAGE);
    } finally {
      setIsGeneratingQueryText(false);
    }
  };

  const handleSendMessage = (content: string) => {
    const nextUserMessageCount = userMessageCount + 1;
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      role: "user",
      content
    };

    setChatMessages((previous) => [...previous, message]);
    setQueryGenerationError("");
    setIsThinking(true);

    setTimeout(() => {
      const assistantContent = buildConversationalReply(content, nextUserMessageCount);

      setChatMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-${Math.random()}`,
          role: "assistant",
          content: assistantContent
        }
      ]);
      setIsThinking(false);
    }, 600);
  };

  const handleSelectTrack = (side: ComparisonSide) => {
    const left = comparisonPair?.left;
    const right = comparisonPair?.right;
    const hasEmbedFailure = embedFailures.left || embedFailures.right;

    if (
      comparisonComplete ||
      hasEmbedFailure ||
      !left?.id ||
      !left.uri ||
      !right?.id ||
      !right.uri
    ) {
      return;
    }

    const nextSession = saveRoundChoice({
      roundIndex: currentRound,
      leftTrackId: left.id,
      rightTrackId: right.id,
      chosenTrackId: side === "left" ? left.id : right.id,
      selectedAt: new Date().toISOString()
    });

    const progress = getProgressFromSession(nextSession);
    setCurrentRound(progress.currentRound);
    setComparisonComplete(progress.comparisonComplete);
    setPairRetryAttempt(0);
    setEmbedFailures({ left: false, right: false });
  };

  const handleEmbedError = (side: ComparisonSide) => {
    setEmbedFailures((previousFailures) => ({
      ...previousFailures,
      [side]: true
    }));
  };

  const handleRetryPair = () => {
    setPairRetryAttempt((previousAttempt) => previousAttempt + 1);
    setComparisonFetchVersion((previousVersion) => previousVersion + 1);
    setEmbedFailures({ left: false, right: false });
    setComparisonErrorMessage("");
  };

  const handleRetryComparisonSearch = () => {
    setComparisonFetchVersion((previousVersion) => previousVersion + 1);
    setComparisonErrorMessage("");
  };

  const handleComparisonTouchStart = (event: TouchEvent<HTMLElement>) => {
    setTouchStartX(event.changedTouches[0]?.clientX ?? null);
  };

  const handleComparisonTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const endX = event.changedTouches[0]?.clientX;

    if (touchStartX === null || typeof endX !== "number") {
      return;
    }

    const deltaX = endX - touchStartX;
    setTouchStartX(null);

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
      return;
    }

    if (deltaX > 0) {
      handleSelectTrack("right");
      return;
    }

    handleSelectTrack("left");
  };

  const hasValidPairData = Boolean(
    comparisonPair?.left.id &&
    comparisonPair.left.uri &&
    comparisonPair?.right.id &&
    comparisonPair.right.uri
  );
  const hasEmbedFailure = embedFailures.left || embedFailures.right;
  const showRetryState =
    step === "compare" &&
    !isComparisonLoading &&
    !comparisonErrorMessage &&
    (!hasValidPairData || hasEmbedFailure);
  const canSelectRound = !comparisonComplete && hasValidPairData && !hasEmbedFailure;

  return (
    <main
      style={{
        boxSizing: "border-box",
        overflowX: "hidden",
        minHeight: "100vh",
        margin: "0 auto",
        maxWidth: "560px",
        padding: "16px",
        width: "100%",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <h1>Spooftify</h1>
      {step === "chat" ? (
        <section aria-label="chat-stage">
          <ChatInterface
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isThinking={isThinking || isGeneratingQueryText}
            showContinue={canContinueToComparison}
            onContinue={handleContinueToComparison}
            continueDisabled={isGeneratingQueryText || isThinking}
          />
          {queryGenerationError ? (
            <div
              aria-label="query-generation-error"
              style={{
                border: "1px solid #f59e0b",
                borderRadius: "12px",
                marginTop: "12px",
                padding: "12px"
              }}
            >
              <p style={{ margin: "0 0 8px" }}>{queryGenerationError}</p>
              <button
                type="button"
                aria-label="retry-query-generation"
                onClick={handleRetryQueryGeneration}
                disabled={isGeneratingQueryText || !lastQueryInput}
              >
                Retry
              </button>
            </div>
          ) : null}
        </section>
      ) : step === "compare" ? (
        <section
          aria-label="comparison-stage"
          onTouchStart={handleComparisonTouchStart}
          onTouchEnd={handleComparisonTouchEnd}
        >
          <p>
            Round {currentRound} of {COMPARISON_TOTAL_ROUNDS}
          </p>
          {isComparisonLoading ? <p>Loading comparison tracks...</p> : null}
          <p aria-label="query-text-seed" style={{ marginTop: "0" }}>
            Spotify seed: {activeQueryText ?? "default"}
          </p>
          {comparisonErrorMessage ? (
            <div
              aria-label="comparison-error-state"
              style={{
                border: "1px solid #f59e0b",
                borderRadius: "12px",
                marginTop: "16px",
                padding: "12px"
              }}
            >
              <p style={{ margin: "0 0 8px" }}>{comparisonErrorMessage}</p>
              <button
                type="button"
                aria-label="retry-comparison-search"
                onClick={handleRetryComparisonSearch}
              >
                Retry
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "16px",
                gridTemplateColumns: "1fr"
              }}
            >
              {(["left", "right"] as const).map((side) => {
                const option = side === "left" ? comparisonPair?.left : comparisonPair?.right;
                const hasValidTrackData = Boolean(option?.id && option.uri);
                const canSelect = hasValidTrackData && canSelectRound;

                return (
                  <article
                    key={side}
                    aria-label={`${side}-track-option`}
                    role="button"
                    aria-disabled={!canSelect}
                    tabIndex={canSelect ? 0 : -1}
                    onClick={() => {
                      if (!canSelect) {
                        return;
                      }

                      handleSelectTrack(side);
                    }}
                    onKeyDown={(event) => {
                      if (!canSelect) {
                        return;
                      }

                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelectTrack(side);
                      }
                    }}
                    style={{
                      border: "1px solid #d4d4d4",
                      borderRadius: "12px",
                      padding: "16px",
                      opacity: canSelect ? 1 : 0.6
                    }}
                  >
                    <h2 style={{ fontSize: "1rem", margin: "0 0 8px" }}>
                      {option?.title ?? "Loading option..."}
                    </h2>
                    {hasValidTrackData ? (
                      <>
                        <iframe
                          title={`${side}-spotify-embed`}
                          src={option?.uri ? `https://open.spotify.com/embed?uri=${encodeURIComponent(option.uri)}` : ""}
                          width="100%"
                          height="232"
                          style={{ border: "none", borderRadius: "12px" }}
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                        />
                        <button
                          type="button"
                          aria-label={`choose-${side}-track`}
                          disabled={!canSelect}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSelectTrack(side);
                          }}
                          style={{
                            marginTop: "12px",
                            minHeight: "44px",
                            padding: "10px 12px",
                            width: "100%"
                          }}
                        >
                          Choose {side === "left" ? "Top" : "Bottom"} track
                        </button>
                        <button
                          type="button"
                          aria-label={`report-${side}-embed-unavailable`}
                          disabled={comparisonComplete}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEmbedError(side);
                          }}
                          style={{
                            marginTop: "8px",
                            minHeight: "36px",
                            padding: "8px 10px",
                            width: "100%"
                          }}
                        >
                          This embed is unavailable
                        </button>
                      </>
                    ) : (
                      <div
                        style={{
                          alignItems: "center",
                          border: "1px dashed #a3a3a3",
                          borderRadius: "12px",
                          display: "flex",
                          height: "232px",
                          justifyContent: "center"
                        }}
                      >
                        <span>Waiting for valid track data...</span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {showRetryState ? (
            <div
              aria-label="embed-retry-state"
              style={{
                border: "1px solid #f59e0b",
                borderRadius: "12px",
                marginTop: "16px",
                padding: "12px"
              }}
            >
              <p style={{ margin: "0 0 8px" }}>
                One or both Spotify embeds are unavailable. Retry to load a new pair.
              </p>
              <button type="button" aria-label="retry-comparison-pair" onClick={handleRetryPair}>
                Retry pair
              </button>
            </div>
          ) : null}
          <p aria-label="comparison-complete-state" style={{ marginTop: "16px" }}>
            Comparison complete: {comparisonComplete ? "true" : "false"}
          </p>
          <button
            type="button"
            aria-label="trigger-final-judgement"
            disabled={!comparisonComplete}
            onClick={() => {
              setJudgement("You've got eclectic taste with a love for introspection—the kind of person who curates playlists like they're building a personality.");
              setStep("judgement");
            }}
          >
            Generate final judgement
          </button>
        </section>
      ) : step === "judgement" ? (
        <JudgementDisplay
          judgement={judgement}
          isLoading={isLoading}
          error={error}
          onRetry={() => {
            setError("");
            setIsLoading(true);
            setTimeout(() => {
              setIsLoading(false);
              setJudgement("You've got great taste! Your music choices reveal a deep emotional intelligence.");
            }, 1500);
          }}
          onNewSession={() => {
            setStep("chat");
            setJudgement("");
            setError("");
            setIsLoading(false);
          }}
        />
      ) : null}
    </main>
  );
}

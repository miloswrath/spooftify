import { useEffect, useState, type TouchEvent } from "react";
import { ChatInterface, type ChatMessage } from "./components/ChatInterface";
import { ComparisonStage } from "./components/ComparisonStage";
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
  embedUrl: string;
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
    embedUrl: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC"
  },
  {
    id: "spotify:track:1301WleyT98MSxVHPZCA6M",
    title: "Option B",
    embedUrl: "https://open.spotify.com/embed/track/1301WleyT98MSxVHPZCA6M"
  },
  {
    id: "spotify:track:5ChkMS8OtdzJeqyybCc9R5",
    title: "Option C",
    embedUrl: "https://open.spotify.com/embed/track/5ChkMS8OtdzJeqyybCc9R5"
  },
  {
    id: "spotify:track:3AJwUDP919kvQ9QcozQPxg",
    title: "Option D",
    embedUrl: "https://open.spotify.com/embed/track/3AJwUDP919kvQ9QcozQPxg"
  }
];

const SWIPE_THRESHOLD_PX = 40;

const mapTrackCandidateToTrackOption = (
  candidate: ComparisonTrackCandidate
): TrackOption => ({
  id: candidate.id,
  title: candidate.title,
  embedUrl: candidate.embedUrl
});

const getComparisonErrorMessage = (error: unknown): string => {
  if (!(error instanceof ComparisonSearchError)) {
    return "We couldn't load tracks right now. Retry to try again.";
  }

  if (error.code === "spotify_auth_failed") {
    return "Music provider authentication is unavailable right now. Please retry shortly.";
  }

  if (error.code === "spotify_rate_limited") {
    return "Too many requests hit the music provider. Please wait a moment and retry.";
  }

  if (error.code === "network_error") {
    return "Network issue while fetching tracks. Check connection and retry.";
  }

  if (error.code === "invalid_query_text") {
    return "We need a clearer vibe description before searching. Add more detail and retry.";
  }

  return "Track search is temporarily unavailable. Retry to continue.";
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

const buildComparisonQueryText = (messages: ChatMessage[]): string => {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ");
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
  const [judgement, setJudgement] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [comparisonPair, setComparisonPair] = useState<ComparisonPair | null>(null);
  const [comparisonCandidates, setComparisonCandidates] = useState<TrackOption[]>(
    FALLBACK_COMPARISON_CANDIDATES
  );
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState("");
  const [currentRound, setCurrentRound] = useState<ComparisonRoundIndex>(1);
  const [comparisonComplete, setComparisonComplete] = useState(false);
  const [pairRetryAttempt, setPairRetryAttempt] = useState(0);
  const [comparisonFetchVersion, setComparisonFetchVersion] = useState(0);
  const [embedFailures, setEmbedFailures] = useState<Record<ComparisonSide, boolean>>({
    left: false,
    right: false
  });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const hasUserMessage = chatMessages.some((message) => message.role === "user");

  useEffect(() => {
    const session = loadComparisonSession();

    if (!session) {
      return;
    }

    const progress = getProgressFromSession(session);
    setCurrentRound(progress.currentRound);
    setComparisonComplete(progress.comparisonComplete);
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
      setComparisonError("No vibe query is available for this session. Retry from chat to continue.");
      setComparisonCandidates([]);
      return;
    }

    let isCancelled = false;

    const loadCandidates = async () => {
      setIsComparisonLoading(true);

      try {
        const result = await fetchComparisonCandidates(queryText);

        if (isCancelled) {
          return;
        }

        const mappedCandidates = result.candidates.map(mapTrackCandidateToTrackOption);

        if (mappedCandidates.length >= 2) {
          setComparisonCandidates(mappedCandidates);
          setComparisonError("");
          return;
        }

        setComparisonCandidates([]);
        setComparisonError("We couldn't find enough playable tracks. Retry to fetch another set.");
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setComparisonCandidates([]);
        setComparisonError(getComparisonErrorMessage(error));
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

  const handleContinueToComparison = () => {
    setGlobalQueryText(buildComparisonQueryText(chatMessages));
    startNewComparisonSession();
    setComparisonPair(null);
    setCurrentRound(1);
    setComparisonComplete(false);
    setPairRetryAttempt(0);
    setComparisonError("");
    setComparisonFetchVersion((previousVersion) => previousVersion + 1);
    setEmbedFailures({ left: false, right: false });
    setStep("compare");
  };

  const handleSendMessage = (content: string) => {
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      role: "user",
      content
    };

    setChatMessages((previous) => [...previous, message]);
    setIsThinking(true);

    setTimeout(() => {
      setChatMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-${Math.random()}`,
          role: "assistant",
          content: "Nice vibe. I can grab two tracks for your comparison next."
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
      !left.embedUrl ||
      !right?.id ||
      !right.embedUrl
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
    setComparisonError("");
    setComparisonFetchVersion((previousVersion) => previousVersion + 1);
    setEmbedFailures({ left: false, right: false });
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
    comparisonPair.left.embedUrl &&
    comparisonPair?.right.id &&
    comparisonPair.right.embedUrl
  );
  const hasEmbedFailure = embedFailures.left || embedFailures.right;
  const showRetryState =
    step === "compare" &&
    !comparisonError &&
    !isComparisonLoading &&
    (!hasValidPairData || hasEmbedFailure);
  const canSelectRound =
    !comparisonComplete &&
    !comparisonError &&
    hasValidPairData &&
    !hasEmbedFailure;

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
            isThinking={isThinking}
            showContinue={hasUserMessage}
            onContinue={handleContinueToComparison}
          />
        </section>
      ) : step === "compare" ? (
        <ComparisonStage
          currentRound={currentRound}
          comparisonPair={comparisonPair}
          comparisonComplete={comparisonComplete}
          isComparisonLoading={isComparisonLoading}
          comparisonError={comparisonError}
          showRetryState={showRetryState}
          canSelectRound={canSelectRound}
          onSelectTrack={handleSelectTrack}
          onEmbedError={handleEmbedError}
          onRetryPair={handleRetryPair}
          onTouchStart={handleComparisonTouchStart}
          onTouchEnd={handleComparisonTouchEnd}
          onTriggerFinalJudgement={() => {
            setJudgement("You've got eclectic taste with a love for introspection—the kind of person who curates playlists like they're building a personality.");
            setStep("judgement");
          }}
        />
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

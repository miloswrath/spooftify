import { type TouchEvent, useEffect, useState } from "react";
import {
  COMPARISON_TOTAL_ROUNDS,
  loadComparisonSession,
  saveRoundChoice,
  startNewComparisonSession,
  type ComparisonRoundIndex,
  type ComparisonSessionState
} from "./features/comparison";

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

const EXAMPLE_COMPARISON_PAIRS: ComparisonPair[] = [
  {
    left: {
      id: "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
      title: "Option A",
      embedUrl: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC"
    },
    right: {
      id: "spotify:track:1301WleyT98MSxVHPZCA6M",
      title: "Option B",
      embedUrl: "https://open.spotify.com/embed/track/1301WleyT98MSxVHPZCA6M"
    }
  },
  {
    left: {
      id: "spotify:track:5ChkMS8OtdzJeqyybCc9R5",
      title: "Option C",
      embedUrl: "https://open.spotify.com/embed/track/5ChkMS8OtdzJeqyybCc9R5"
    },
    right: {
      id: "spotify:track:3AJwUDP919kvQ9QcozQPxg",
      title: "Option D",
      embedUrl: "https://open.spotify.com/embed/track/3AJwUDP919kvQ9QcozQPxg"
    }
  }
];

const SWIPE_THRESHOLD_PX = 40;

const getComparisonPairForRound = (
  roundIndex: ComparisonRoundIndex,
  retryAttempt: number
): ComparisonPair => {
  const pairIndex = (roundIndex - 1 + retryAttempt) % EXAMPLE_COMPARISON_PAIRS.length;

  return EXAMPLE_COMPARISON_PAIRS[pairIndex];
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
  const [step, setStep] = useState<"chat" | "compare">("chat");
  const [comparisonPair, setComparisonPair] = useState<ComparisonPair | null>(null);
  const [currentRound, setCurrentRound] = useState<ComparisonRoundIndex>(1);
  const [comparisonComplete, setComparisonComplete] = useState(false);
  const [pairRetryAttempt, setPairRetryAttempt] = useState(0);
  const [embedFailures, setEmbedFailures] = useState<Record<ComparisonSide, boolean>>({
    left: false,
    right: false
  });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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

    setComparisonPair(getComparisonPairForRound(currentRound, pairRetryAttempt));
  }, [step, currentRound, pairRetryAttempt]);

  const handleContinueToComparison = () => {
    startNewComparisonSession();
    setComparisonPair(null);
    setCurrentRound(1);
    setComparisonComplete(false);
    setPairRetryAttempt(0);
    setEmbedFailures({ left: false, right: false });
    setStep("compare");
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
  const showRetryState = step === "compare" && (!hasValidPairData || hasEmbedFailure);
  const canSelectRound = !comparisonComplete && hasValidPairData && !hasEmbedFailure;

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: "0 auto",
        maxWidth: "560px",
        padding: "16px",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <h1>Spooftify</h1>
      {step === "chat" ? (
        <section aria-label="chat-stage">
          <p>Chat input stub</p>
          <button type="button" onClick={handleContinueToComparison}>
            Continue to comparison
          </button>
        </section>
      ) : (
        <section
          aria-label="comparison-stage"
          onTouchStart={handleComparisonTouchStart}
          onTouchEnd={handleComparisonTouchEnd}
        >
          <p>
            Round {currentRound} of {COMPARISON_TOTAL_ROUNDS}
          </p>
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "1fr"
            }}
          >
            {(["left", "right"] as const).map((side) => {
              const option = side === "left" ? comparisonPair?.left : comparisonPair?.right;
              const hasValidTrackData = Boolean(option?.id && option.embedUrl);
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
                        src={option.embedUrl}
                        onError={() => handleEmbedError(side)}
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
          >
            Generate final judgement
          </button>
        </section>
      )}
    </main>
  );
}

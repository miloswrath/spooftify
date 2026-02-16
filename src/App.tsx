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

const EXAMPLE_COMPARISON_PAIR: ComparisonPair = {
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
};

const SWIPE_THRESHOLD_PX = 40;

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

    setComparisonPair(EXAMPLE_COMPARISON_PAIR);
  }, [step]);

  const handleContinueToComparison = () => {
    startNewComparisonSession();
    setComparisonPair(null);
    setCurrentRound(1);
    setComparisonComplete(false);
    setStep("compare");
  };

  const handleSelectTrack = (side: "left" | "right") => {
    const left = comparisonPair?.left;
    const right = comparisonPair?.right;

    if (
      comparisonComplete ||
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
              const canSelect = hasValidTrackData && !comparisonComplete;

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

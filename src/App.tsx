import { type TouchEvent, useEffect, useState } from "react";
import {
  COMPARISON_TOTAL_ROUNDS,
  saveRoundChoice,
  startNewComparisonSession,
  type ComparisonRoundIndex
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

export function App() {
  const [step, setStep] = useState<"chat" | "compare">("chat");
  const [comparisonPair, setComparisonPair] = useState<ComparisonPair | null>(null);
  const [currentRound, setCurrentRound] = useState<ComparisonRoundIndex>(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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
    setStep("compare");
  };

  const handleSelectTrack = (side: "left" | "right") => {
    const left = comparisonPair?.left;
    const right = comparisonPair?.right;

    if (!left?.id || !left.embedUrl || !right?.id || !right.embedUrl) {
      return;
    }

    saveRoundChoice({
      roundIndex: currentRound,
      leftTrackId: left.id,
      rightTrackId: right.id,
      chosenTrackId: side === "left" ? left.id : right.id,
      selectedAt: new Date().toISOString()
    });

    setCurrentRound((previousRound) => nextRoundIndex(previousRound));
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
          <p>Round {currentRound} of {COMPARISON_TOTAL_ROUNDS}</p>
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "1fr"
            }}
          >
            {["left", "right"].map((side) => {
              const option = side === "left" ? comparisonPair?.left : comparisonPair?.right;
              const hasValidTrackData = Boolean(option?.id && option.embedUrl);

              return (
                <article
                  key={side}
                  aria-label={`${side}-track-option`}
                  role="button"
                  aria-disabled={!hasValidTrackData}
                  tabIndex={hasValidTrackData ? 0 : -1}
                  onClick={() => {
                    if (!hasValidTrackData) {
                      return;
                    }

                    handleSelectTrack(side as "left" | "right");
                  }}
                  onKeyDown={(event) => {
                    if (!hasValidTrackData) {
                      return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelectTrack(side as "left" | "right");
                    }
                  }}
                  style={{
                    border: "1px solid #d4d4d4",
                    borderRadius: "12px",
                    padding: "16px",
                    opacity: hasValidTrackData ? 1 : 0.6
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
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectTrack(side as "left" | "right");
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
        </section>
      )}
    </main>
  );
}
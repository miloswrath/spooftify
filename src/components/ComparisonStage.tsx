import type { TouchEvent } from "react";
import { COMPARISON_TOTAL_ROUNDS, type ComparisonRoundIndex } from "../features/comparison";

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

type ComparisonStageProps = {
  currentRound: ComparisonRoundIndex;
  comparisonPair: ComparisonPair | null;
  comparisonComplete: boolean;
  isComparisonLoading: boolean;
  comparisonError: string;
  showRetryState: boolean;
  canSelectRound: boolean;
  onSelectTrack: (side: ComparisonSide) => void;
  onEmbedError: (side: ComparisonSide) => void;
  onRetryPair: () => void;
  onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  onTouchEnd: (event: TouchEvent<HTMLElement>) => void;
  onTriggerFinalJudgement: () => void;
};

export function ComparisonStage({
  currentRound,
  comparisonPair,
  comparisonComplete,
  isComparisonLoading,
  comparisonError,
  showRetryState,
  canSelectRound,
  onSelectTrack,
  onEmbedError,
  onRetryPair,
  onTouchStart,
  onTouchEnd,
  onTriggerFinalJudgement
}: ComparisonStageProps) {
  return (
    <section
      aria-label="comparison-stage"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <p>
        Round {currentRound} of {COMPARISON_TOTAL_ROUNDS}
      </p>
      {isComparisonLoading ? <p>Loading comparison tracks...</p> : null}
      {comparisonError ? (
        <div
          aria-label="comparison-error-state"
          style={{
            border: "1px solid #dc2626",
            borderRadius: "12px",
            marginBottom: "16px",
            padding: "12px"
          }}
        >
          <p style={{ margin: "0 0 8px" }}>{comparisonError}</p>
          <button
            type="button"
            aria-label="retry-comparison-search"
            onClick={onRetryPair}
          >
            Retry search
          </button>
        </div>
      ) : null}
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

                onSelectTrack(side);
              }}
              onKeyDown={(event) => {
                if (!canSelect) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectTrack(side);
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
                    src={option?.embedUrl ?? ""}
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
                      onSelectTrack(side);
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
                      onEmbedError(side);
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
          <button type="button" aria-label="retry-comparison-pair" onClick={onRetryPair}>
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
        onClick={onTriggerFinalJudgement}
      >
        Generate final judgement
      </button>
    </section>
  );
}

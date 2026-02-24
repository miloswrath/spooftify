import { useEffect, useState, type FocusEvent, type TouchEvent } from "react";
import { COMPARISON_TOTAL_ROUNDS, type ComparisonRoundIndex } from "../features/comparison";

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

type ComparisonStageProps = {
  currentRound: ComparisonRoundIndex;
  comparisonPair: ComparisonPair | null;
  embedUrls: Record<ComparisonSide, string | null>;
  comparisonComplete: boolean;
  isComparisonLoading: boolean;
  comparisonErrorMessage: string;
  showRetryState: boolean;
  canSelectRound: boolean;
  onSelectTrack: (side: ComparisonSide) => void;
  onEmbedError: (side: ComparisonSide) => void;
  onRetryPair: () => void;
  onRetryComparisonSearch: () => void;
  onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  onTouchEnd: (event: TouchEvent<HTMLElement>) => void;
  onTriggerFinalJudgement: () => void;
};

export function ComparisonStage({
  currentRound,
  comparisonPair,
  embedUrls,
  comparisonComplete,
  isComparisonLoading,
  comparisonErrorMessage,
  showRetryState,
  canSelectRound,
  onSelectTrack,
  onEmbedError,
  onRetryPair,
  onRetryComparisonSearch,
  onTouchStart,
  onTouchEnd,
  onTriggerFinalJudgement
}: ComparisonStageProps) {
  const [revealedSide, setRevealedSide] = useState<ComparisonSide | null>(null);
  const [requiresHoverConfirm, setRequiresHoverConfirm] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    setRequiresHoverConfirm(
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
  }, []);

  const clearRevealOnBlur = (
    side: ComparisonSide,
    event: FocusEvent<HTMLElement>
  ) => {
    if (!requiresHoverConfirm) {
      return;
    }

    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setRevealedSide((previousSide) => (previousSide === side ? null : previousSide));
  };

  return (
    <section
      className="comparison-stage"
      aria-label="comparison-stage"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <p className="comparison-stage__round">
        Round {currentRound} of {COMPARISON_TOTAL_ROUNDS}
      </p>
      <p className="comparison-stage__swipe-hint" aria-label="swipe-selection-hint">
        Swipe left or right to choose quickly on touch devices.
      </p>
      {isComparisonLoading ? <p className="comparison-stage__loading">Loading comparison tracks...</p> : null}
      {comparisonErrorMessage ? (
        <div
          aria-label="comparison-error-state"
          className="comparison-stage__error"
        >
          <p>{comparisonErrorMessage}</p>
          <button
            type="button"
            aria-label="retry-comparison-search"
            onClick={onRetryComparisonSearch}
          >
            Retry
          </button>
        </div>
      ) : null}
      <div className="comparison-stage__cards">
        {(["left", "right"] as const).map((side) => {
          const option = side === "left" ? comparisonPair?.left : comparisonPair?.right;
          const optionEmbedUrl = side === "left" ? embedUrls.left : embedUrls.right;
          const hasValidTrackData = Boolean(option?.id && option.uri && optionEmbedUrl);
          const canSelect = hasValidTrackData && canSelectRound;
          const isRevealed = revealedSide === side;
          const showConfirmControl = !requiresHoverConfirm || isRevealed;

          return (
            <article
              key={side}
              className={`comparison-card${isRevealed ? " comparison-card--revealed" : ""}`}
              aria-label={`${side}-track-option`}
              role="button"
              aria-disabled={!canSelect}
              tabIndex={canSelect ? 0 : -1}
              onClick={() => {
                if (!canSelect) {
                  return;
                }

                if (requiresHoverConfirm && !isRevealed) {
                  setRevealedSide(side);
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
              onMouseEnter={() => {
                if (requiresHoverConfirm && canSelect) {
                  setRevealedSide(side);
                }
              }}
              onMouseLeave={() => {
                if (requiresHoverConfirm) {
                  setRevealedSide((previousSide) =>
                    previousSide === side ? null : previousSide
                  );
                }
              }}
              onFocus={() => {
                if (requiresHoverConfirm && canSelect) {
                  setRevealedSide(side);
                }
              }}
              onBlur={(event) => {
                clearRevealOnBlur(side, event);
              }}
            >
              <div className="comparison-card__content">
                <h2 className="comparison-card__title">{option?.title ?? "Loading option..."}</h2>
                {hasValidTrackData ? (
                  <>
                    <iframe
                      title={`${side}-spotify-embed`}
                      src={optionEmbedUrl ?? ""}
                      width="100%"
                      height="232"
                      style={{ border: "none", borderRadius: "12px" }}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      aria-label={`report-${side}-embed-unavailable`}
                      disabled={comparisonComplete}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEmbedError(side);
                      }}
                      className="comparison-card__report"
                    >
                      This embed is unavailable
                    </button>
                  </>
                ) : (
                  <div className="comparison-card__placeholder">
                    <span>Waiting for valid track data...</span>
                  </div>
                )}
              </div>
              <div
                className="comparison-card__action-zone"
                data-visible={showConfirmControl ? "true" : "false"}
              >
                <button
                  type="button"
                  aria-label={`choose-${side}-track`}
                  aria-hidden={!showConfirmControl}
                  tabIndex={showConfirmControl && canSelect ? 0 : -1}
                  disabled={!canSelect || !showConfirmControl}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectTrack(side);
                  }}
                  className="comparison-card__confirm"
                >
                  ✓
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {showRetryState ? (
        <div
          aria-label="embed-retry-state"
          className="comparison-stage__retry"
        >
          <p>
            One or both Spotify embeds are unavailable. Retry to load a new pair.
          </p>
          <button type="button" aria-label="retry-comparison-pair" onClick={onRetryPair}>
            Retry pair
          </button>
        </div>
      ) : null}
      <p aria-label="comparison-complete-state" className="comparison-stage__complete">
        Comparison complete: {comparisonComplete ? "true" : "false"}
      </p>
      <button
        type="button"
        aria-label="trigger-final-judgement"
        disabled={!comparisonComplete}
        onClick={onTriggerFinalJudgement}
        className="comparison-stage__final-action"
      >
        Generate final judgement
      </button>
    </section>
  );
}

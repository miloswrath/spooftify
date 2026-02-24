import { ReactNode } from "react";

interface JudgementDisplayProps {
  judgement?: string;
  isLoading?: boolean;
  error?: string;
  onRetry: () => void;
  onNewSession: () => void;
}

export function JudgementDisplay({
  judgement,
  isLoading,
  error,
  onRetry,
  onNewSession
}: JudgementDisplayProps) {
  let content: ReactNode;

  if (isLoading) {
    content = (
      <>
        <div className="judgement-stage__spinner" data-testid="loading-spinner" />
        <p className="judgement-stage__status">Generating your judgement...</p>
      </>
    );
  } else if (error) {
    content = (
      <>
        <p className="judgement-stage__error">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="judgement-stage__button judgement-stage__button--secondary"
          data-testid="retry-button"
        >
          Retry
        </button>
      </>
    );
  } else if (judgement) {
    content = <p className="judgement-stage__copy">{judgement}</p>;
  } else {
    content = <p className="judgement-stage__status">Waiting for judgement...</p>;
  }

  return (
    <section className="judgement-stage" aria-label="judgement-stage">
      <div className="judgement-stage__panel" data-testid="judgement-box">
        {content}
      </div>
      {!isLoading ? (
        <div className="judgement-stage__actions">
          <button
            type="button"
            onClick={onNewSession}
            className="judgement-stage__button judgement-stage__button--primary"
            data-testid="new-session-button"
          >
            Start New Session
          </button>
        </div>
      ) : null}
    </section>
  );
}

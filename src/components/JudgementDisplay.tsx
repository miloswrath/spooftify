import { CSSProperties, ReactNode } from "react";

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
  onNewSession,
}: JudgementDisplayProps) {
  // Container styles - mobile-first responsive
  const containerStyles: CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
    padding: "16px",
    boxSizing: "border-box",
  };

  // Judgement box styles - centered white box with padding
  const boxStyles: CSSProperties = {
    backgroundColor: "#ffffff",
    color: "#000000",
    padding: "24px",
    borderRadius: "8px",
    textAlign: "center",
    width: "90vw",
    maxWidth: "500px",
    minHeight: "200px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    wordWrap: "break-word",
    overflowWrap: "break-word",
    fontSize: "16px",
    lineHeight: "1.5",
    fontFamily: "system-ui, sans-serif",
    boxSizing: "border-box",
    gap: "16px",
  };

  // Loading spinner styles
  const spinnerStyles: CSSProperties = {
    width: "40px",
    height: "40px",
    border: "4px solid #e0e0e0",
    borderTop: "4px solid #000000",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  // Button styles
  const buttonStyles: CSSProperties = {
    padding: "12px 24px",
    marginTop: "16px",
    fontSize: "14px",
    fontWeight: "500",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    minWidth: "120px",
  };

  const primaryButtonStyles: CSSProperties = {
    ...buttonStyles,
    backgroundColor: "#000000",
    color: "#ffffff",
  };

  const primaryButtonHoverStyles: CSSProperties = {
    backgroundColor: "#333333",
  };

  const secondaryButtonStyles: CSSProperties = {
    ...buttonStyles,
    backgroundColor: "#ffffff",
    color: "#000000",
    border: "2px solid #000000",
  };

  const secondaryButtonHoverStyles: CSSProperties = {
    backgroundColor: "#f5f5f5",
  };

  // Button container for layout
  const buttonContainerStyles: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
    marginTop: "16px",
  };

  // Content renderer
  let content: ReactNode;

  if (isLoading) {
    content = (
      <>
        <style>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
        <div style={spinnerStyles} data-testid="loading-spinner" />
        <p style={{ margin: "0", color: "#666666", fontSize: "14px" }}>
          Generating your judgement...
        </p>
      </>
    );
  } else if (error) {
    content = (
      <>
        <p style={{ margin: "0 0 16px 0", color: "#d32f2f", fontSize: "14px" }}>
          {error}
        </p>
        <button
          onClick={onRetry}
          style={secondaryButtonStyles}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, secondaryButtonHoverStyles);
          }}
          onMouseLeave={(e) => {
            Object.assign(e.currentTarget.style, { backgroundColor: "#ffffff" });
          }}
          data-testid="retry-button"
        >
          Retry
        </button>
      </>
    );
  } else if (judgement) {
    content = <p style={{ margin: "0", whiteSpace: "pre-wrap" }}>{judgement}</p>;
  } else {
    content = <p style={{ margin: "0", color: "#999999" }}>Waiting for judgement...</p>;
  }

  return (
    <div style={containerStyles}>
      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div style={boxStyles} data-testid="judgement-box">
        {content}
      </div>

      {!isLoading && (
        <div style={buttonContainerStyles}>
          <button
            onClick={onNewSession}
            style={primaryButtonStyles}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, primaryButtonHoverStyles);
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, { backgroundColor: "#000000" });
            }}
            data-testid="new-session-button"
          >
            Start New Session
          </button>
        </div>
      )}
    </div>
  );
}

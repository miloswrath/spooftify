import { useState } from "react";
import { JudgementDisplay } from "./components/JudgementDisplay";

export function App() {
  const [step, setStep] = useState<"chat" | "compare" | "judgement">("chat");
  const [judgement, setJudgement] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleMoveToComparison = () => {
    setStep("compare");
  };

  const handleMoveToJudgement = () => {
    setJudgement("You've got eclectic taste with a love for introspection—the kind of person who curates playlists like they're building a personality.");
    setStep("judgement");
  };

  const handleRetry = () => {
    setError("");
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setJudgement("You've got great taste! Your music choices reveal a deep emotional intelligence.");
    }, 1500);
  };

  const handleNewSession = () => {
    setStep("chat");
    setJudgement("");
    setError("");
    setIsLoading(false);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: "0 auto",
        maxWidth: "480px",
        padding: "16px",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <h1>Spooftify</h1>
      {step === "chat" ? (
        <section aria-label="chat-stage">
          <p>Chat input stub</p>
          <button type="button" onClick={handleMoveToComparison}>
            Continue to comparison
          </button>
        </section>
      ) : step === "compare" ? (
        <section aria-label="comparison-stage">
          <p>Comparison screen stub</p>
          <button type="button" onClick={handleMoveToJudgement}>
            Move to judgement (demo)
          </button>
        </section>
      ) : (
        <JudgementDisplay
          judgement={judgement}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
          onNewSession={handleNewSession}
        />
      )}
    </main>
  );
}

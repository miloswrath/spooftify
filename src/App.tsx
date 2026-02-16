import { useState } from "react";

export function App() {
  const [step, setStep] = useState<"chat" | "compare">("chat");

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
          <button type="button" onClick={() => setStep("compare")}>
            Continue to comparison
          </button>
        </section>
      ) : (
        <section aria-label="comparison-stage">
          <p>Comparison screen stub</p>
        </section>
      )}
    </main>
  );
}
import { useEffect, useMemo, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isThinking: boolean;
  onContinue?: () => void;
  showContinue?: boolean;
  continueDisabled?: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isThinking,
  onContinue,
  showContinue = false,
  continueDisabled = false
}: ChatInterfaceProps) {
  const [draft, setDraft] = useState("");
  const messageContainerRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => draft.trim().length > 0 && !isThinking, [draft, isThinking]);

  useEffect(() => {
    const container = messageContainerRef.current;

    if (!container) {
      return;
    }

    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages, isThinking]);

  function handleSend() {
    const nextMessage = draft.trim();

    if (!nextMessage || isThinking) {
      return;
    }

    onSendMessage(nextMessage);
    setDraft("");
  }

  return (
    <section
      aria-label="chat-interface"
      style={{
        width: "100%",
        maxWidth: "1200px",
        height: "calc(100dvh - 180px)",
        minHeight: "min(420px, calc(100dvh - 180px))",
        maxHeight: "760px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        aria-label="chat-messages"
        ref={messageContainerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}
      >
        {messages.map((message) => (
          <article
            key={message.id}
            aria-label={`${message.role}-message`}
            data-message-role={message.role}
            style={{
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "10px 12px",
              borderRadius: "12px",
              background: message.role === "user" ? "#dbeafe" : "#f3f4f6",
              color: "#111827",
              whiteSpace: "pre-wrap"
            }}
          >
            {message.content}
          </article>
        ))}

        {isThinking ? (
          <article
            aria-label="thinking-indicator"
            role="status"
            aria-live="polite"
            data-message-role="assistant-thinking"
            style={{
              alignSelf: "flex-start",
              maxWidth: "85%",
              padding: "10px 12px",
              borderRadius: "12px",
              border: "1px dashed #d1d5db",
              background: "#f9fafb",
              color: "#4b5563"
            }}
          >
            Thinking...
          </article>
        ) : null}
      </div>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          borderTop: "1px solid rgba(156, 163, 175, 0.35)",
          padding: "12px"
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            aria-label="message-input"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSend();
              }
            }}
            style={{
              flex: 1,
              minHeight: "48px",
              border: "1px solid rgba(156, 163, 175, 0.45)",
              borderRadius: "12px",
              padding: "0 12px",
              fontSize: "16px",
              background: "rgba(15, 23, 42, 0.72)",
              color: "#e5e7eb"
            }}
            placeholder="Tell me your vibe..."
          />
          <button
            aria-label="send-message"
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            style={{
              minHeight: "48px",
              minWidth: "64px",
              border: "1px solid rgba(16, 185, 129, 0.45)",
              borderRadius: "12px",
              padding: "0 14px",
              background: canSend ? "#059669" : "#1f2937",
              color: canSend ? "#ecfeff" : "#94a3b8"
            }}
          >
            Send
          </button>
        </div>

        {showContinue ? (
          <button
            aria-label="continue-to-comparison"
            type="button"
            onClick={onContinue}
            disabled={continueDisabled}
            style={{
              marginTop: "12px",
              width: "100%",
              minHeight: "48px",
              border: "1px solid rgba(56, 189, 248, 0.45)",
              borderRadius: "12px",
              background: "rgba(15, 23, 42, 0.84)",
              color: "#e2e8f0"
            }}
          >
            Continue to comparison
          </button>
        ) : null}
      </div>
    </section>
  );
}

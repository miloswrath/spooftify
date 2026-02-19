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
        minHeight: "100dvh",
        width: "100%",
        maxWidth: "480px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <div
        aria-label="chat-messages"
        ref={messageContainerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
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
          borderTop: "1px solid #e5e7eb",
          background: "#ffffff",
          padding: "10px 12px"
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
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
              minHeight: "44px",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              padding: "0 12px",
              fontSize: "16px"
            }}
            placeholder="Tell me your vibe..."
          />
          <button
            aria-label="send-message"
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            style= {{
              minHeight: "44px",
              minWidth: "44px",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              padding: "0 12px",
              background: canSend ? "#111827" : "#f3f4f6",
              color: canSend ? "#ffffff" : "#6b7280"
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
              marginTop: "10px",
              width: "100%",
              minHeight: "44px",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#111827"
            }}
          >
            Continue to comparison
          </button>
        ) : null}
      </div>
    </section>
  );
}
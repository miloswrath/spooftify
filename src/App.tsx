import { useState } from "react";
import { ChatInterface, type ChatMessage } from "./components/ChatInterface";

export function App() {
  const [step, setStep] = useState<"chat" | "compare">("chat");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content: "Tell me your vibe and what kind of music you want right now."
    }
  ]);

  function handleSendMessage(content: string) {
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      role: "user",
      content
    };

    setMessages((previous) => [...previous, message]);
    setIsThinking(true);

    setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-${Math.random()}`,
          role: "assistant",
          content: "Nice vibe. I can grab two tracks for your comparison next."
        }
      ]);
      setIsThinking(false);
    }, 600);
  }

  const hasUserMessage = messages.some((message) => message.role === "user");

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
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isThinking={isThinking}
            showContinue={hasUserMessage}
            onContinue={() => setStep("compare")}
          />
        </section>
      ) : (
        <section aria-label="comparison-stage">
          <p>Comparison screen stub</p>
        </section>
      )}
    </main>
  );
}
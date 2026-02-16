import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatInterface } from "./ChatInterface";

describe("ChatInterface", () => {
  it("renders component with empty message list", () => {
    render(<ChatInterface messages={[]} onSendMessage={vi.fn()} isThinking={false} />);

    expect(screen.getByLabelText("chat-interface")).toBeTruthy();
    expect(screen.getByLabelText("chat-messages")).toBeTruthy();
    expect(screen.getByLabelText("message-input")).toBeTruthy();
    expect(screen.getByRole("button", { name: "send-message" })).toBeTruthy();
  });

  it("renders provided user and assistant messages", () => {
    render(
      <ChatInterface
        messages={[
          { id: "1", role: "assistant", content: "What vibe are you in?" },
          { id: "2", role: "user", content: "Dreamy but upbeat" }
        ]}
        onSendMessage={vi.fn()}
        isThinking={false}
      />
    );

    expect(screen.getByText("What vibe are you in?")).toBeTruthy();
    expect(screen.getByText("Dreamy but upbeat")).toBeTruthy();

    const userMessages = screen.getAllByLabelText("user-message");
    const assistantMessages = screen.getAllByLabelText("assistant-message");

    expect(userMessages.length).toBe(1);
    expect(assistantMessages.length).toBe(1);
  });

  it("applies distinct role-based styling for user and assistant messages", () => {
    render(
      <ChatInterface
        messages={[
          { id: "assistant-1", role: "assistant", content: "Calm and cozy." },
          { id: "user-1", role: "user", content: "Late-night neon." }
        ]}
        onSendMessage={vi.fn()}
        isThinking={false}
      />
    );

    const assistantMessage = screen.getByText("Calm and cozy.").closest("article");
    const userMessage = screen.getByText("Late-night neon.").closest("article");

    expect(assistantMessage?.getAttribute("data-message-role")).toBe("assistant");
    expect(userMessage?.getAttribute("data-message-role")).toBe("user");
    expect(assistantMessage?.getAttribute("style")).toContain("align-self: flex-start");
    expect(userMessage?.getAttribute("style")).toContain("align-self: flex-end");
    expect(assistantMessage?.getAttribute("style")).not.toBe(userMessage?.getAttribute("style"));
  });

  it("renders multiple messages in a scrollable message container", () => {
    const messages = Array.from({ length: 8 }, (_, index) => ({
      id: `message-${index + 1}`,
      role: index % 2 === 0 ? ("assistant" as const) : ("user" as const),
      content: `Message ${index + 1}`
    }));

    render(<ChatInterface messages={messages} onSendMessage={vi.fn()} isThinking={false} />);

    const messageContainer = screen.getByLabelText("chat-messages");

    expect(messageContainer.getAttribute("style")).toContain("overflow-y: auto");
    expect(screen.getAllByText(/Message \d+/).length).toBe(8);
  });

  it("updates input value when user types", async () => {
    const user = userEvent.setup();

    render(<ChatInterface messages={[]} onSendMessage={vi.fn()} isThinking={false} />);

    const input = screen.getByLabelText("message-input") as HTMLInputElement;

    await user.type(input, "sunset drive energy");

    expect(input.value).toBe("sunset drive energy");
  });

  it("keeps send button disabled when input is empty", () => {
    render(<ChatInterface messages={[]} onSendMessage={vi.fn()} isThinking={false} />);

    const sendButton = screen.getByRole("button", { name: "send-message" }) as HTMLButtonElement;

    expect(sendButton.disabled).toBe(true);
  });

  it("enables send button when input has content", async () => {
    const user = userEvent.setup();

    render(<ChatInterface messages={[]} onSendMessage={vi.fn()} isThinking={false} />);

    const input = screen.getByLabelText("message-input");
    const sendButton = screen.getByRole("button", { name: "send-message" }) as HTMLButtonElement;

    await user.type(input, "hyper-pop but chill");

    expect(sendButton.disabled).toBe(false);
  });

  it("calls onSendMessage with typed content when send is clicked", async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();

    render(<ChatInterface messages={[]} onSendMessage={onSendMessage} isThinking={false} />);

    const input = screen.getByLabelText("message-input");
    const sendButton = screen.getByRole("button", { name: "send-message" });

    await user.type(input, "moody midnight jazz");
    await user.click(sendButton);

    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(onSendMessage).toHaveBeenCalledWith("moody midnight jazz");
  });

  it("clears the input after sending a message", async () => {
    const user = userEvent.setup();

    render(<ChatInterface messages={[]} onSendMessage={vi.fn()} isThinking={false} />);

    const input = screen.getByLabelText("message-input") as HTMLInputElement;
    const sendButton = screen.getByRole("button", { name: "send-message" });

    await user.type(input, "indie but cinematic");
    await user.click(sendButton);

    expect(input.value).toBe("");
  });

  it("shows thinking indicator when isThinking is true", () => {
    render(
      <ChatInterface
        messages={[{ id: "assistant-1", role: "assistant", content: "Give me a sec." }]}
        onSendMessage={vi.fn()}
        isThinking
      />
    );

    expect(screen.getByLabelText("thinking-indicator")).toBeTruthy();
    expect(screen.getByText("Thinking...")).toBeTruthy();
  });

  it("keeps send button disabled during thinking state", async () => {
    const user = userEvent.setup();

    render(<ChatInterface messages={[]} onSendMessage={vi.fn()} isThinking />);

    const input = screen.getByLabelText("message-input");
    const sendButton = screen.getByRole("button", { name: "send-message" }) as HTMLButtonElement;

    await user.type(input, "still waiting");

    expect(sendButton.disabled).toBe(true);
  });

  it("auto-scrolls to latest message when message list changes", () => {
    const { rerender } = render(
      <ChatInterface
        messages={[{ id: "1", role: "assistant", content: "First message" }]}
        onSendMessage={vi.fn()}
        isThinking={false}
      />
    );

    const messageContainer = screen.getByLabelText("chat-messages") as HTMLDivElement;

    Object.defineProperty(messageContainer, "scrollHeight", {
      configurable: true,
      value: 420
    });

    messageContainer.scrollTop = 0;

    rerender(
      <ChatInterface
        messages={[
          { id: "1", role: "assistant", content: "First message" },
          { id: "2", role: "user", content: "Second message" }
        ]}
        onSendMessage={vi.fn()}
        isThinking={false}
      />
    );

    expect(messageContainer.scrollTop).toBe(420);
  });

  it("shows continue button when showContinue is true", () => {
    render(
      <ChatInterface
        messages={[]}
        onSendMessage={vi.fn()}
        isThinking={false}
        showContinue
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "continue-to-comparison" })).toBeTruthy();
  });

  it("calls onContinue when continue button is clicked", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();

    render(
      <ChatInterface
        messages={[]}
        onSendMessage={vi.fn()}
        isThinking={false}
        showContinue
        onContinue={onContinue}
      />
    );

    await user.click(screen.getByRole("button", { name: "continue-to-comparison" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("sends message when Enter is pressed in input", async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();

    render(<ChatInterface messages={[]} onSendMessage={onSendMessage} isThinking={false} />);

    const input = screen.getByLabelText("message-input");

    await user.type(input, "shoegaze and rain");
    await user.keyboard("{Enter}");

    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(onSendMessage).toHaveBeenCalledWith("shoegaze and rain");
  });

  it("supports keyboard tab navigation across input and send controls", async () => {
    const user = userEvent.setup();

    render(<ChatInterface messages={[]} onSendMessage={vi.fn()} isThinking={false} />);

    await user.tab();
    const input = screen.getByLabelText("message-input");
    expect(input).toBe(document.activeElement);

    await user.type(input, "keyboard flow");

    await user.tab();
    expect(screen.getByRole("button", { name: "send-message" })).toBe(document.activeElement);
  });

  it("uses mobile-friendly touch target sizing for input and buttons", () => {
    render(
      <ChatInterface
        messages={[]}
        onSendMessage={vi.fn()}
        isThinking={false}
        showContinue
        onContinue={vi.fn()}
      />
    );

    const input = screen.getByLabelText("message-input");
    const sendButton = screen.getByRole("button", { name: "send-message" });
    const continueButton = screen.getByRole("button", { name: "continue-to-comparison" });

    expect(input.getAttribute("style")).toContain("min-height: 44px");
    expect(sendButton.getAttribute("style")).toContain("min-height: 44px");
    expect(continueButton.getAttribute("style")).toContain("min-height: 44px");
  });
});
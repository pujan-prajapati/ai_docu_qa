import { useState, useCallback } from "react";

export const useChat = (sessionId, persona) => {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);

  const sendMessage = useCallback(
    async (userMessage) => {
      // Add user message immediately — optimistic UI
      // Like optimistic updates in React Query
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: userMessage,
        },
      ]);

      // Add empty assistant message — we'll fill it token by token
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
        },
      ]);

      setStreaming(true);

      const response = await fetch(
        "https://aidocuqa-production.up.railway.app/api/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage, sessionId, persona }),
        },
      );

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const json = JSON.parse(line.replace("data: ", ""));
          if (json.token === "[DONE]") {
            setStreaming(false);
            break;
          }
          if (json.error) {
            setStreaming(false);
            break;
          }

          // Append token to last message (the assistant bubble)
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: updated[updated.length - 1].content + json.token,
            };
            return updated;
          });
        }
      }
    },
    [sessionId, persona],
  );

  return { messages, setMessages, streaming, sendMessage };
};

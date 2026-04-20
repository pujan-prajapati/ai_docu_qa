const BASE = "http://localhost:5000/api";

export const uploadDocument = async (file, sessionId) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sessionId", sessionId);

  const res = await fetch(`${BASE}/document/upload`, {
    method: "POST",
    body: formData,
  });
  return res.json();
};

export const checkDocument = async (sessionId) => {
  const res = await fetch(`${BASE}/document/${sessionId}`);
  return res.json();
};

export const getChatHistory = async (sessionId) => {
  const res = await fetch(`${BASE}/chat/history/${sessionId}`);
  return res.json();
};

export const clearHistory = async (sessionId) => {
  await fetch(`${BASE}/chat/history/${sessionId}`, { method: "DELETE" });
};

export const uploadDocumentWithProgress = async (
  file,
  sessionId,
  onProgress,
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sessionId", sessionId);

  const response = await fetch(`${BASE}/document/upload`, {
    method: "POST",
    body: formData,
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

    for (const line of lines) {
      const json = JSON.parse(line.replace("data: ", ""));
      onProgress(json); // send progress events to UI
      if (json.status === "done") return json;
    }
  }
};

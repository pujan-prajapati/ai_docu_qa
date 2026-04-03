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

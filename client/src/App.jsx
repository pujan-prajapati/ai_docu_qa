import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useChat } from "./hooks/useChat";
import {
  checkDocument,
  uploadDocumentWithProgress,
  getChatHistory,
  clearHistory,
} from "./api/chat";

const PERSONAS = [
  { id: "default", label: "🤖 Assistant", desc: "Helpful & concise" },
  {
    id: "researcher",
    label: "🔬 Researcher",
    desc: "Deep analysis & citations",
  },
  { id: "simplifier", label: "🎓 Simplifier", desc: "ELI15 explanations" },
  { id: "critic", label: "🧐 Critic", desc: "Devil's advocate" },
];

export default function App() {
  const [uploadProgress, setUploadProgress] = useState(null);
  const [sessionId] = useState(
    () =>
      localStorage.getItem("sessionId") ||
      (() => {
        const id = uuidv4();
        localStorage.setItem("sessionId", id);
        return id;
      })(),
  );
  const [persona, setPersona] = useState("default");
  const [input, setInput] = useState("");
  const [document, setDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef(null);

  const { messages, setMessages, streaming, sendMessage } = useChat(
    sessionId,
    persona,
  );

  // Load existing session on mount
  useEffect(() => {
    (async () => {
      const [docData, historyData] = await Promise.all([
        checkDocument(sessionId),
        getChatHistory(sessionId),
      ]);
      if (docData.hasDocument) setDocument(docData.document);
      if (historyData.messages?.length) setMessages(historyData.messages);
    })();
  }, [sessionId]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress({ status: "starting", progress: 0, total: 0 });

    await uploadDocumentWithProgress(file, sessionId, (event) => {
      setUploadProgress(event);

      if (event.status === "done") {
        setDocument({
          originalName: event.originalName,
          totalChunks: event.totalChunks,
          characters: event.characters,
        });
        setUploading(false);
      }

      if (event.error) {
        setUploading(false);
      }
    });
  };

  const handleSend = async () => {
    if (!input.trim() || streaming || !document) return;
    const msg = input.trim();
    setInput("");
    await sendMessage(msg);
  };

  const handleClear = async () => {
    await clearHistory(sessionId);
    setMessages([]);
    setDocument(null);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans">
      {/* ── Sidebar ── */}
      <aside className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col p-4 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">📄 DocuMind</h1>
          <p className="text-xs text-gray-500 mt-1">Chat with your documents</p>
        </div>

        {/* File Upload */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleUpload(e.dataTransfer.files[0]);
          }}
          onClick={() =>
            document ? null : document?.getElementById("fileInput")?.click()
          }
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
            ${dragOver ? "border-blue-500 bg-blue-500/10" : "border-gray-700 hover:border-gray-500"}
            ${uploading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          {uploading ? (
            <div>
              <p className="text-sm text-blue-400">Uploading...</p>
              {uploadProgress && (
                <div className="mt-2">
                  <p className="text-xs text-blue-400 mb-1">
                    {uploadProgress.status === "chunking" &&
                      "Splitting document..."}
                    {uploadProgress.status === "embedding" &&
                      `Embedding chunks... ${uploadProgress.progress}/${uploadProgress.total}`}
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: uploadProgress.total
                          ? `${(uploadProgress.progress / uploadProgress.total) * 100}%`
                          : "10%",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : document ? (
            <div>
              <p className="text-green-400 text-sm font-medium">
                ✅ {document.originalName}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {document.characters?.toLocaleString()} characters
              </p>
            </div>
          ) : (
            <div>
              <p className="text-3xl mb-2">📂</p>
              <p className="text-sm text-gray-400">Drop PDF or TXT here</p>
              <label className="mt-2 inline-block text-xs text-blue-400 cursor-pointer hover:underline">
                or click to browse
                <input
                  id="fileInput"
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files[0])}
                />
              </label>
            </div>
          )}
        </div>

        {/* Persona Selector */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
            AI Persona
          </p>
          <div className="flex flex-col gap-2">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPersona(p.id)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-all
                  ${
                    persona === p.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
              >
                <span className="font-medium">{p.label}</span>
                <span className="block text-xs opacity-70">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Clear Session */}
        <button
          onClick={handleClear}
          className="mt-auto text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          🗑️ Clear session
        </button>
      </aside>

      {/* ── Main Chat Area ── */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-semibold">
              {document
                ? `Chatting with: ${document.originalName}`
                : "No document loaded"}
            </p>
            <p className="text-xs text-gray-500">
              Persona: {PERSONAS.find((p) => p.id === persona)?.label}
            </p>
          </div>
          {streaming && (
            <span className="text-xs text-blue-400 animate-pulse">
              ● AI is typing...
            </span>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-600">
              <p className="text-5xl mb-4">📄</p>
              <p className="text-lg font-medium">
                Upload a document to get started
              </p>
              <p className="text-sm mt-1">Ask anything about your file</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-800 text-gray-100 rounded-bl-sm"
                }`}
              >
                {msg.content}
                {/* Blinking cursor while streaming on last assistant message */}
                {streaming &&
                  i === messages.length - 1 &&
                  msg.role === "assistant" && (
                    <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse rounded-sm" />
                  )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-gray-800 px-6 py-4">
          {!document && (
            <p className="text-center text-sm text-yellow-500 mb-2">
              ⚠️ Upload a document first to start chatting
            </p>
          )}
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSend()
              }
              placeholder={
                document
                  ? "Ask something about your document..."
                  : "Upload a document first..."
              }
              disabled={!document || streaming}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm
                         placeholder-gray-500 focus:outline-none focus:border-blue-500
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!document || streaming || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                         px-5 py-3 rounded-xl font-medium text-sm transition-all"
            >
              {streaming ? "..." : "Send →"}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">
            Session: {sessionId.slice(0, 8)}...
          </p>
        </div>
      </main>
    </div>
  );
}

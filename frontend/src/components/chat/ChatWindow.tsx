"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { useAuth } from "@/lib/auth";
import { API_BASE, WS_BASE } from "@/lib/constants";
import type { RoomInfo } from "@/components/ChatApp";

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
}

interface ChatWindowProps {
  room: RoomInfo;
  onBack: () => void;
  onStartCall: (
    targetUserId: string,
    targetUsername: string,
    callType: "audio" | "video",
  ) => Promise<void>;
}

export default function ChatWindow({
  room,
  onBack,
  onStartCall,
}: ChatWindowProps) {
  const { user } = useAuth();
  const userId = user!.user_id;
  const token = user!.session_token;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load message history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/rooms/${room.id}/messages?token=${encodeURIComponent(token)}&limit=200`,
        );
        if (res.ok && !cancelled) {
          const data = (await res.json()) as Message[];
          setMessages(data);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [room.id, token]);

  // Connect to room WebSocket
  useEffect(() => {
    const url = `${WS_BASE}/ws/room/${room.id}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);

    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "chat_message" && payload.data) {
          setMessages((prev) => [...prev, payload.data as Message]);
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => ws.close();
    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [room.id, token]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({ type: "chat_message", content: text }),
    );
    setInput("");
  };

  const dmTargetId = room.member_ids.find((id) => id !== userId);

  return (
    <div className="flex h-full flex-col bg-navy-900">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-navy-700 bg-navy-800 px-3 py-2.5">
        {/* Back button — visible on portrait mobile */}
        <button
          onClick={onBack}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-navy-700 hover:text-white landscape:hidden"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-400">
          {(room.name || "D")[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">
            {room.name || "Direct Message"}
          </p>
          <p className="text-xs text-slate-400">
            {room.is_group
              ? `${room.member_ids.length} members`
              : "1-on-1 Chat"}
          </p>
        </div>

        {/* Call buttons */}
        {!room.is_group && dmTargetId && (
          <div className="flex gap-1">
            <button
              onClick={() => onStartCall(dmTargetId, room.name || "User", "audio")}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-navy-700 hover:text-white"
              title="Audio Call"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </button>
            <button
              onClick={() => onStartCall(dmTargetId, room.name || "User", "video")}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-navy-700 hover:text-white"
              title="Video Call"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No messages yet. Say hello!
          </div>
        )}
        <div className="space-y-2">
          {messages.map((msg) => {
            const isMine = msg.sender_id === userId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "rounded-br-md bg-indigo-500 text-white"
                      : "rounded-bl-md bg-navy-700 text-slate-200"
                  }`}
                >
                  {!isMine && (
                    <p className="mb-0.5 text-xs font-semibold text-indigo-400">
                      {msg.sender_name}
                    </p>
                  )}
                  <p className="break-words text-sm leading-relaxed">
                    {msg.content}
                  </p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      isMine ? "text-indigo-200/60" : "text-slate-500"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-navy-700 bg-navy-800 px-3 py-2.5"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          maxLength={4000}
          className="min-w-0 flex-1 rounded-xl border border-navy-600 bg-navy-700 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition hover:bg-indigo-600 disabled:opacity-40"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}

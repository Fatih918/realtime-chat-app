"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { useWS } from "@/lib/websocket";
import { API_BASE } from "@/lib/constants";
import type { RoomInfo } from "@/components/ChatApp";

interface SidebarProps {
  onSelectRoom: (room: RoomInfo) => void;
  onStartCall: (
    targetUserId: string,
    targetUsername: string,
    callType: "audio" | "video",
  ) => Promise<void>;
}

export default function Sidebar({
  onSelectRoom,
  onStartCall,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const userId = user!.user_id;
  const token = user!.session_token;
  const { connected } = useWS();
  const onlineUsers = useOnlineUsers(userId);

  const handleUserClick = useCallback(
    async (targetId: string, targetName: string) => {
      try {
        const res = await fetch(`${API_BASE}/api/rooms?token=${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "",
            member_ids: [targetId],
          }),
        });
        if (!res.ok) throw new Error("Failed to create room");
        const room = await res.json();
        onSelectRoom({
          id: room.id,
          name: targetName,
          is_group: room.is_group,
          member_ids: room.member_ids,
        });
      } catch (err) {
        console.error("Room creation failed:", err);
      }
    },
    [token, onSelectRoom],
  );

  return (
    <div className="flex h-full flex-col bg-navy-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20">
            <svg
              className="h-5 w-5 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white">ChatCall</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-rose-400"}`}
          />
          <button
            onClick={logout}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-navy-700 hover:text-white"
            title="Logout"
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Current user */}
      <div className="border-b border-navy-700 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Logged in as
        </p>
        <p className="mt-0.5 font-semibold text-white">{user!.username}</p>
      </div>

      {/* Online Users */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Online Users ({onlineUsers.length})
          </p>
        </div>

        {onlineUsers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No other users online
          </div>
        ) : (
          <ul className="space-y-0.5 px-2">
            {onlineUsers.map((u) => (
              <li key={u.user_id}>
                <button
                  onClick={() => handleUserClick(u.user_id, u.username)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-navy-700"
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-400">
                      {u.username[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-navy-800 bg-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                      {u.username}
                    </p>
                    <p className="text-xs text-emerald-400">Online</p>
                  </div>
                  {/* Quick call buttons */}
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartCall(u.user_id, u.username, "audio");
                      }}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-navy-600 hover:text-white"
                      title="Audio Call"
                    >
                      <svg
                        className="h-4 w-4"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartCall(u.user_id, u.username, "video");
                      }}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-navy-600 hover:text-white"
                      title="Video Call"
                    >
                      <svg
                        className="h-4 w-4"
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
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

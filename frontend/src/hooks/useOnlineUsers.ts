"use client";

import { useWS, type OnlineUser } from "@/lib/websocket";

export function useOnlineUsers(currentUserId: string): OnlineUser[] {
  const { onlineUsers } = useWS();
  return onlineUsers.filter((u) => u.user_id !== currentUserId);
}

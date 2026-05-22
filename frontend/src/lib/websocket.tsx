"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { WS_BASE } from "./constants";

export interface OnlineUser {
  user_id: string;
  username: string;
}

export type WSMessage = {
  type: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

type Listener = (msg: WSMessage) => void;

interface WSCtx {
  connected: boolean;
  onlineUsers: OnlineUser[];
  subscribe: (listener: Listener) => () => void;
  send: (payload: object) => void;
}

const WebSocketContext = createContext<WSCtx>({
  connected: false,
  onlineUsers: [],
  subscribe: () => () => {},
  send: () => {},
});

export function WebSocketProvider({
  token,
  children,
}: {
  token: string;
  userId: string;
  children: ReactNode;
}) {
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<Listener>>(new Set());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => void>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const doConnect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const url = `${WS_BASE}/ws/online?token=${encodeURIComponent(token)}`;
      const socket = new WebSocket(url);

      socket.onopen = () => {
        setConnected(true);
      };

      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WSMessage;
          if (msg.type === "online_users") {
            setOnlineUsers(msg.data as unknown as OnlineUser[]);
          }
          listenersRef.current.forEach((fn) => fn(msg));
        } catch {
          // ignore malformed
        }
      };

      socket.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        reconnectTimer.current = setTimeout(() => connectRef.current?.(), 3000);
      };

      socket.onerror = () => {
        socket.close();
      };

      wsRef.current = socket;
    };

    connectRef.current = doConnect;
    doConnect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [token]);

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return (
    <WebSocketContext.Provider
      value={{ connected, onlineUsers, subscribe, send }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWS() {
  return useContext(WebSocketContext);
}

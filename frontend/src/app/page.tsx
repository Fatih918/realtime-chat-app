"use client";


import { AuthProvider, useAuth } from "@/lib/auth";
import { WebSocketProvider } from "@/lib/websocket";
import LoginScreen from "@/components/LoginScreen";
import ChatApp from "@/components/ChatApp";

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <WebSocketProvider token={user.session_token} userId={user.user_id}>
      <ChatApp />
    </WebSocketProvider>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useWebRTC } from "@/hooks/useWebRTC";
import Sidebar from "@/components/chat/Sidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import CallOverlay from "@/components/call/CallOverlay";
import IncomingCallModal from "@/components/call/IncomingCallModal";

export interface RoomInfo {
  id: string;
  name: string;
  is_group: boolean;
  member_ids: string[];
}

export default function ChatApp() {
  const { user } = useAuth();
  const userId = user!.user_id;
  const [activeRoom, setActiveRoom] = useState<RoomInfo | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const webrtc = useWebRTC(userId);

  const handleSelectRoom = useCallback((room: RoomInfo) => {
    setActiveRoom(room);
    setShowSidebar(false);
  }, []);

  const handleBack = useCallback(() => {
    setShowSidebar(true);
  }, []);

  return (
    <div className="relative flex h-[100dvh] w-full bg-navy-900">
      {/* Sidebar: visible on desktop always, on mobile only when showSidebar */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden"
        } h-full w-full shrink-0 flex-col landscape:flex landscape:w-80`}
      >
        <Sidebar
          onSelectRoom={handleSelectRoom}
          onStartCall={webrtc.startCall}
        />
      </div>

      {/* ChatWindow: visible on desktop always, on mobile only when room selected */}
      <div
        className={`${
          !showSidebar ? "flex" : "hidden"
        } h-full min-w-0 flex-1 flex-col landscape:flex`}
      >
        {activeRoom ? (
          <ChatWindow
            room={activeRoom}
            onBack={handleBack}
            onStartCall={webrtc.startCall}
          />
        ) : (
          <div className="hidden h-full flex-col items-center justify-center landscape:flex">
            <div className="text-center text-slate-500">
              <svg
                className="mx-auto mb-4 h-16 w-16 opacity-30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-lg">Select a user to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Incoming call modal */}
      {webrtc.callState.incoming && webrtc.callState.remoteUserId && (
        <IncomingCallModal
          callerName={webrtc.callState.remoteUsername ?? "Unknown"}
          callType={webrtc.callState.callType}
          onAccept={() =>
            webrtc.answerCall(
              webrtc.callState.remoteUserId!,
              webrtc.callState.remoteUsername ?? "",
              webrtc.callState.callType,
            )
          }
          onReject={() => webrtc.rejectCall(webrtc.callState.remoteUserId!)}
        />
      )}

      {/* Active call overlay */}
      {webrtc.callState.active && (
        <CallOverlay
          localStream={webrtc.localStream}
          remoteStream={webrtc.remoteStream}
          remoteName={webrtc.callState.remoteUsername ?? ""}
          callType={webrtc.callState.callType}
          audioMuted={webrtc.audioMuted}
          videoOff={webrtc.videoOff}
          onToggleAudio={webrtc.toggleAudio}
          onToggleVideo={webrtc.toggleVideo}
          onHangup={webrtc.hangup}
        />
      )}
    </div>
  );
}

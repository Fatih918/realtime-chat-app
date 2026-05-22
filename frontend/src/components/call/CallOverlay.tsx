"use client";

import { useRef, useEffect } from "react";
import CallControls from "./CallControls";

interface CallOverlayProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteName: string;
  callType: "audio" | "video";
  audioMuted: boolean;
  videoOff: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onHangup: () => void;
}

export default function CallOverlay({
  localStream,
  remoteStream,
  remoteName,
  callType,
  audioMuted,
  videoOff,
  onToggleAudio,
  onToggleVideo,
  onHangup,
}: CallOverlayProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-navy-900">
      {/* Caller info */}
      <div className="absolute left-0 right-0 top-0 z-20 bg-gradient-to-b from-black/60 to-transparent px-4 pb-8 pt-4">
        <p className="text-center text-lg font-semibold text-white">
          {remoteName}
        </p>
        <p className="text-center text-sm text-slate-300">
          {remoteStream ? "Connected" : "Connecting..."}
        </p>
      </div>

      {/* Video area */}
      {callType === "video" ? (
        <div className="call-grid flex-1">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video bg-navy-800"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video bg-navy-700"
          />
        </div>
      ) : (
        /* Audio-only display */
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-500/20">
              <span className="text-3xl font-bold text-indigo-400">
                {remoteName[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
            <p className="text-xl font-semibold text-white">{remoteName}</p>
            <p className="mt-1 text-sm text-slate-400">
              {remoteStream ? "Audio Connected" : "Connecting..."}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <CallControls
        audioMuted={audioMuted}
        videoOff={videoOff}
        callType={callType}
        onToggleAudio={onToggleAudio}
        onToggleVideo={onToggleVideo}
        onHangup={onHangup}
      />
    </div>
  );
}

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useWS, type WSMessage } from "@/lib/websocket";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export interface CallState {
  active: boolean;
  remoteUserId: string | null;
  remoteUsername: string | null;
  callType: "audio" | "video";
  incoming: boolean;
}

export function useWebRTC(_userId: string) {
  const { subscribe, send } = useWS();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callState, setCallState] = useState<CallState>({
    active: false,
    remoteUserId: null,
    remoteUsername: null,
    callType: "video",
    incoming: false,
  });
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState({
      active: false,
      remoteUserId: null,
      remoteUsername: null,
      callType: "video",
      incoming: false,
    });
    setAudioMuted(false);
    setVideoOff(false);
  }, []);

  const createPC = useCallback(
    (remoteUserId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({
            type: "rtc_ice_candidate",
            target_user_id: remoteUserId,
            candidate: e.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0] ?? null);
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          cleanup();
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [send, cleanup],
  );

  const startCall = useCallback(
    async (
      targetUserId: string,
      targetUsername: string,
      callType: "audio" | "video" = "video",
    ) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPC(targetUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      send({
        type: "rtc_call_request",
        target_user_id: targetUserId,
        call_type: callType,
      });

      setCallState({
        active: true,
        remoteUserId: targetUserId,
        remoteUsername: targetUsername,
        callType,
        incoming: false,
      });
    },
    [createPC, send],
  );

  const answerCall = useCallback(
    async (fromUserId: string, fromUsername: string, callType: "audio" | "video") => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPC(fromUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      send({
        type: "rtc_call_response",
        target_user_id: fromUserId,
        accepted: true,
      });

      setCallState({
        active: true,
        remoteUserId: fromUserId,
        remoteUsername: fromUsername,
        callType,
        incoming: false,
      });
    },
    [createPC, send],
  );

  const rejectCall = useCallback(
    (fromUserId: string) => {
      send({
        type: "rtc_call_response",
        target_user_id: fromUserId,
        accepted: false,
      });
      setCallState((prev) =>
        prev.incoming
          ? {
              active: false,
              remoteUserId: null,
              remoteUsername: null,
              callType: "video",
              incoming: false,
            }
          : prev,
      );
    },
    [send],
  );

  const hangup = useCallback(() => {
    if (callState.remoteUserId) {
      send({
        type: "rtc_hangup",
        target_user_id: callState.remoteUserId,
      });
    }
    cleanup();
  }, [callState.remoteUserId, send, cleanup]);

  const toggleAudio = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setAudioMuted((prev) => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setVideoOff((prev) => !prev);
  }, []);

  // Handle incoming signaling messages
  useEffect(() => {
    const unsub = subscribe((msg: WSMessage) => {
      const fromUserId = msg.from_user_id as string | undefined;
      const fromUsername = msg.from_username as string | undefined;

      switch (msg.type) {
        case "rtc_call_request": {
          if (!callState.active && fromUserId && fromUsername) {
            setCallState({
              active: false,
              remoteUserId: fromUserId,
              remoteUsername: fromUsername,
              callType: (msg.call_type as "audio" | "video") ?? "video",
              incoming: true,
            });
          }
          break;
        }

        case "rtc_call_response": {
          if (msg.accepted && pcRef.current && fromUserId) {
            // Caller side: remote accepted → send offer
            (async () => {
              const pc = pcRef.current;
              if (!pc) return;
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              send({
                type: "rtc_offer",
                target_user_id: fromUserId,
                sdp: offer.sdp ?? "",
              });
            })();
          } else {
            cleanup();
          }
          break;
        }

        case "rtc_offer": {
          if (fromUserId) {
            (async () => {
              let pc = pcRef.current;
              if (!pc) {
                pc = createPC(fromUserId);
                const stream = localStreamRef.current;
                if (stream) {
                  stream
                    .getTracks()
                    .forEach((track) => pc!.addTrack(track, stream));
                }
              }
              await pc.setRemoteDescription(
                new RTCSessionDescription({
                  type: "offer",
                  sdp: msg.sdp as string,
                }),
              );
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              send({
                type: "rtc_answer",
                target_user_id: fromUserId,
                sdp: answer.sdp ?? "",
              });
            })();
          }
          break;
        }

        case "rtc_answer": {
          if (pcRef.current) {
            pcRef.current.setRemoteDescription(
              new RTCSessionDescription({
                type: "answer",
                sdp: msg.sdp as string,
              }),
            );
          }
          break;
        }

        case "rtc_ice_candidate": {
          if (pcRef.current && msg.candidate) {
            pcRef.current.addIceCandidate(
              new RTCIceCandidate(msg.candidate as RTCIceCandidateInit),
            );
          }
          break;
        }

        case "rtc_hangup": {
          cleanup();
          break;
        }
      }
    });

    return unsub;
  }, [subscribe, send, callState.active, createPC, cleanup]);

  return {
    callState,
    localStream,
    remoteStream,
    audioMuted,
    videoOff,
    startCall,
    answerCall,
    rejectCall,
    hangup,
    toggleAudio,
    toggleVideo,
  };
}

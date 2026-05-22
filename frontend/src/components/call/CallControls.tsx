"use client";

interface CallControlsProps {
  audioMuted: boolean;
  videoOff: boolean;
  callType: "audio" | "video";
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onHangup: () => void;
}

export default function CallControls({
  audioMuted,
  videoOff,
  callType,
  onToggleAudio,
  onToggleVideo,
  onHangup,
}: CallControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-6 bg-gradient-to-t from-black/60 to-transparent px-4 pb-8 pt-12">
      {/* Mute / Unmute */}
      <button
        onClick={onToggleAudio}
        className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
          audioMuted
            ? "bg-rose-500/80 text-white"
            : "bg-navy-700/80 text-white hover:bg-navy-600/80"
        }`}
        title={audioMuted ? "Unmute" : "Mute"}
      >
        {audioMuted ? (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </button>

      {/* Camera toggle (video calls only) */}
      {callType === "video" && (
        <button
          onClick={onToggleVideo}
          className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
            videoOff
              ? "bg-rose-500/80 text-white"
              : "bg-navy-700/80 text-white hover:bg-navy-600/80"
          }`}
          title={videoOff ? "Turn on camera" : "Turn off camera"}
        >
          {videoOff ? (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
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
          )}
        </button>
      )}

      {/* End Call */}
      <button
        onClick={onHangup}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600"
        title="End Call"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
          />
        </svg>
      </button>
    </div>
  );
}

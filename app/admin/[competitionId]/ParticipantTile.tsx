"use client";

import { TrackReference, VideoTrack } from "@livekit/components-react";
import { Participant, Track } from "livekit-client";
import { Camera, Monitor, VideoOff, Ban, MessageSquare , RotateCcw } from "lucide-react";

export default function ParticipantTile({
  trackRefs,
  participant,
  isBlocked,
  onBlock,
  onPrivateMessage,
  onGrantReEntry,
}: {
  trackRefs: TrackReference[];
  participant: Participant;
  isBlocked: boolean;
  onBlock: (participantIdentity: string) => void;
  onPrivateMessage: (participantIdentity: string, participantName: string) => void;
  onGrantReEntry: (participantIdentity: string) => void;

}) {
  const cameraRef = trackRefs.find((r) => r.source === Track.Source.Camera);
  const screenRef = trackRefs.find((r) => r.source === Track.Source.ScreenShare);

  const isCameraOn = !!cameraRef?.publication?.isSubscribed;
  const isScreenSharing = !!screenRef?.publication?.isSubscribed;
  const displayName = participant.name || participant.identity;

  return (
    <div
      className={`relative bg-gray-900 rounded-xl overflow-hidden border flex flex-col shadow-lg ${
        isBlocked ? "border-red-600" : "border-gray-800"
      }`}
    >
      {/* Blocked overlay */}
      {isBlocked && (
        <div className="absolute inset-0 z-40 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
          <Ban className="w-10 h-10 text-red-400 mb-2" />
          <span className="text-red-300 font-bold text-sm">Blocked</span>
        </div>
      )}

      {/* Video area */}
      <div className="relative w-full aspect-video bg-gray-950">
        {/* Screen share — main view */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {screenRef ? (
            <VideoTrack
              trackRef={screenRef}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center text-gray-600">
              <Monitor className="w-12 h-12 mb-2 opacity-50" />
              <span className="text-sm font-medium">No Screen Share</span>
            </div>
          )}
        </div>

        {/* Camera PiP */}
        <div className="absolute bottom-2 right-2 w-1/3 aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-800 shadow-2xl z-10">
          {cameraRef ? (
            <VideoTrack
              trackRef={cameraRef}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-gray-950">
              <VideoOff className="w-6 h-6 mb-1 opacity-50" />
              <span className="text-xs font-medium">Cam Off</span>
            </div>
          )}
        </div>

        {/* Top bar: name + stream indicators */}
        <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/80 to-transparent z-20 flex justify-between items-start">
          <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-md max-w-[150px] truncate shadow-sm">
            {displayName}
          </div>
          <div className="flex gap-1.5">
            <div
              className={`p-1.5 rounded-md backdrop-blur-md ${isCameraOn ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
              title={isCameraOn ? "Camera On" : "Camera Off"}
            >
              <Camera className="w-3.5 h-3.5" />
            </div>
            <div
              className={`p-1.5 rounded-md backdrop-blur-md ${isScreenSharing ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
              title={isScreenSharing ? "Screen Sharing" : "No Screen Share"}
            >
              <Monitor className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Warning border if streams missing */}
        {!isBlocked && (!isCameraOn || !isScreenSharing) && (
          <div className="absolute inset-0 border-2 border-red-500/50 rounded-t-xl pointer-events-none z-30 animate-pulse" />
        )}
      </div>

      {/* Action bar — always visible below the video */}
      <div className="flex gap-2 p-2 bg-gray-900 border-t border-gray-800 z-20">
        <button
          onClick={() => onPrivateMessage(participant.identity, displayName)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Message
        </button>
        <button
          onClick={() => onBlock(participant.identity)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            isBlocked
              ? "bg-green-700 hover:bg-green-600 text-white"
              : "bg-red-700 hover:bg-red-600 text-white"
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          {isBlocked ? "Unblock" : "Block"}
        </button>
        <button
          onClick={() => onGrantReEntry(participant.identity)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Re-entry
        </button>

      </div>
    </div>
  );
}

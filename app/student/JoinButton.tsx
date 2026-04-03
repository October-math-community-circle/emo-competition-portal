"use client";

import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { joinCompetition } from "@/app/server-actions/joinCompetition";
import { Competition } from "@october-math-community-circle/shared-utitilies/competition";
import { Modal } from "@/components/ui/Modal";
import { MonitorX, ShieldAlert, Lock, Clock } from "lucide-react";
import { useStreams } from "./useStreams";
import { useUser } from "../hooks/useUser";
import { useRouter } from "next/navigation";

interface JoinButtonProps {
  competitionId: string;
  isJoined: boolean;
  status: Competition["status"];
}

// These errors mean the student can never join — disable the button permanently
const PERMANENT_ERRORS = [
  "Re-entry is not allowed",
  "already entered",
  "join window has closed",
];

function isPermanentError(msg: string) {
  return PERMANENT_ERRORS.some((e) => msg.toLowerCase().includes(e.toLowerCase()));
}

export function JoinButton({
  competitionId,
  isJoined,
  status,
}: JoinButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permanentlyBlocked, setPermanentlyBlocked] = useState(false);
  const [showStreamsError, setShowStreamsError] = useState(false);
  const {
    updateCompetitionId,
    updateLivekitToken,
    setScreenStream,
    setCameraStream,
  } = useStreams();

  const resetTracks = () => {
    setScreenStream((prev) => {
      if (prev) prev.getTracks().forEach((track) => track.stop());
      return null;
    });
    setCameraStream((prev) => {
      if (prev) prev.getTracks().forEach((track) => track.stop());
      return null;
    });
  };

  const shareStreams = async () => {
    resetTracks();
    try {
      const ScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
      });
      setScreenStream(ScreenStream);
      const [screenTrack] = ScreenStream.getVideoTracks();

      if (screenTrack.getSettings().displaySurface !== "monitor") {
        ScreenStream.getTracks().forEach((track) => track.stop());
        setShowStreamsError(true);
        return;
      }

      const CameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setCameraStream(CameraStream);
    } catch (error) {
      console.log({ shareStreamsError: error });
      setShowStreamsError(true);
      throw error;
    }
  };

  const handleJoin = async () => {
    setLoading(true);
    setError(null);
    try {
      await shareStreams();
      const result = await joinCompetition(competitionId);
      if (!result.success) {
        const msg = result.error || "Failed to join";
        setError(msg);
        if (isPermanentError(msg)) setPermanentlyBlocked(true);
        resetTracks();
        return;
      }
      updateCompetitionId(competitionId);
      updateLivekitToken(result.data);
    } catch (err: unknown) {
      console.log({ handleJoinError: err });
      resetTracks();
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (isJoined) {
    return (
      <Button
        variant="outline"
        className="w-full cursor-default border-green-200 bg-green-50 text-green-700 hover:bg-green-50"
        disabled
      >
        Joined ✓
      </Button>
    );
  }

  // Permanently blocked — show a locked state instead of a button
  if (permanentlyBlocked && error) {
    const isWindowClosed = error.toLowerCase().includes("window");
    return (
      <div className="w-full rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-3">
        {isWindowClosed ? (
          <Clock className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        ) : (
          <Lock className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        )}
        <p className="text-sm text-red-700 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <Button
        variant="primary"
        className="w-full"
        onClick={handleJoin}
        disabled={loading || status !== "in_progress"}
      >
        {loading ? "Joining..." : "Join Competition"}
      </Button>
      {error && <p className="text-center text-xs text-danger">{error}</p>}

      <Modal
        isOpen={showStreamsError}
        onClose={() => setShowStreamsError(false)}
        title="Screen Share Required"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-danger/10 p-4 text-danger">
            <MonitorX className="h-10 w-10" />
          </div>
          <h4 className="mb-2 text-xl font-bold text-foreground">
            Entire Screen Required
          </h4>
          <p className="mb-6 text-muted-foreground">
            To ensure a fair competition, you must share your **entire screen**
            (monitor), and your **camera** must be on, not just a window or a
            tab.
          </p>
          <div className="flex w-full flex-col gap-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={async () => {
                setShowStreamsError(false);
                await handleJoin();
              }}
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowStreamsError(false)}
            >
              Cancel
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
            <p>
              Your screen sharing and camera is monitored for proctoring
              purposes.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

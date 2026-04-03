"use client";

import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { joinCompetition } from "@/app/server-actions/joinCompetition";
import { Competition } from "@october-math-community-circle/shared-utitilies/competition";
import { Modal } from "@/components/ui/Modal";
import { MonitorX, ShieldAlert } from "lucide-react";
import { useStreams } from "./useStreams";
import { useUser } from "../hooks/useUser";
import { useRouter } from "next/navigation";

interface JoinButtonProps {
  competitionId: string;
  isJoined: boolean;
  status: Competition["status"];
}

export function JoinButton({
  competitionId,
  isJoined,
  status,
}: JoinButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStreamsError, setShowStreamsError] = useState(false);
  const {
    updateCompetitionId,
    updateLivekitToken,
    setScreenStream,
    setCameraStream,
  } = useStreams();
  const resetTracks = () => {
    setScreenStream((prev) => {
      if (prev) {
        prev.getTracks().forEach((track) => track.stop());
      }
      return null;
    });
    setCameraStream((prev) => {
      if (prev) {
        prev.getTracks().forEach((track) => track.stop());
      }
      return null;
    });
  };
  const shareStreams = async () => {
    resetTracks();
    try {
      const ScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor", // Prefer window
        },
        audio: false,
      });
      setScreenStream(ScreenStream);
      const [screenTrack] = ScreenStream.getVideoTracks();
      console.log(screenTrack.getSettings().displaySurface);

      if (screenTrack.getSettings().displaySurface != "monitor") {
        const tracks = ScreenStream.getTracks();
        tracks.forEach((track) => track.stop());
        setShowStreamsError(true);
        return;
      }
      console.log({ ScreenStream });
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
        setError(result.error || "Failed to join");
        throw new Error(result.error || "Failed to join");
      }
      updateCompetitionId(competitionId);
      console.log("liveKit token", result.data);

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

  return (
    <div className="w-full space-y-2">
      <Button
        variant="primary"
        className="w-full"
        onClick={handleJoin}
        disabled={loading || status != "open"}
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

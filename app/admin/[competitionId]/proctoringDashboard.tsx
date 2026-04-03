"use client";

import { useEffect, useMemo, useState } from "react";
import "@livekit/components-styles";
import AdminGrid from "./adminGrid";
import IncidentsSidebar from "@/app/admin/[competitionId]/IncidentsSidebar";
import { AlertTriangle } from "lucide-react";
import { RemoteParticipant, Room, RoomEvent } from "livekit-client";
import { startProctoring } from "@/app/server-actions/proctor";
import { RoomContext } from "@livekit/components-react";

export default function AdminPage({
  liveKitToken,
  competitionId,
}: {
  liveKitToken: string;
  competitionId: string;
}) {
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const room = useMemo(
    () => new Room({ adaptiveStream: true, dynacast: true }),
    [],
  );
  useEffect(() => {
    (async () => {
      await room.connect(
        process.env.NEXT_PUBLIC_LIVEKIT_URL as string,
        liveKitToken,
      );
      /* const remoteParticipants: RemoteParticipant[] = [];
      for (const participant of room.remoteParticipants.values()) {
        if (
          participant.hasMetadata &&
          (JSON.parse(participant.metadata as string) as { role: string })
            ?.role === "student"
        ) {
          remoteParticipants.push(participant);
        }
      }
      setParticipants(remoteParticipants); */
      setHasJoined(true);
    })();
    return () => {
      room.removeAllListeners().disconnect();
    };
  }, [competitionId]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-4">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Error Joining Room</h1>
        <p className="text-gray-400 max-w-md text-center bg-gray-900 border border-gray-800 p-4 rounded-lg">
          {error}
        </p>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 animate-pulse">
            Connecting to proctoring session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <RoomContext.Provider value={room}>
      <div className="h-screen w-full flex flex-col overflow-hidden bg-gray-950 text-white">
        <header className="bg-gray-900 border-b border-gray-800 p-4 shrink-0 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 px-3 py-1 rounded-md text-sm font-bold shadow-sm">
              Proctor Dashboard
            </div>
            <div className="text-gray-300 font-medium tracking-wide">
              Room: <span className="text-white">{competitionId}</span>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            Live Monitoring Active
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Pass competitionId so AdminGrid can call server actions */}
          <AdminGrid competitionId={competitionId} />
          <IncidentsSidebar roomName={competitionId as string} />
        </div>
      </div>
    </RoomContext.Provider>
  );
}

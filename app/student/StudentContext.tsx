"use client";
import { createLocalVideoTrack, Room, RoomEvent, Track } from "livekit-client";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { useUser } from "../hooks/useUser";
import { db, realtimeDb } from "../firebase";
import {
  onValue,
  ref as rlDbRef,
  set,
  serverTimestamp,
  Unsubscribe,
  onDisconnect,
} from "firebase/database";
import { useRouter } from "next/navigation";
import { addDoc, collection } from "firebase/firestore";
import DisconnectedModal from "./disconnectedModal";

export const userContext = createContext<{
  screenStream: MediaStream | null;
  cameraStream: MediaStream | null;
  livekitToken: string;
  updateLivekitToken: (token: string) => void;
  competitionId: string;
  updateCompetitionId: (token: string) => void;
  setScreenStream: Dispatch<SetStateAction<MediaStream | null>>;
  setCameraStream: Dispatch<SetStateAction<MediaStream | null>>;
}>({
  screenStream: null,
  cameraStream: null,
  livekitToken: "",
  updateLivekitToken: () => {},
  competitionId: "",
  updateCompetitionId: () => {},
  setScreenStream: () => {},
  setCameraStream: () => {},
});
function StudentContext({ children }: { children: React.ReactNode }) {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [livekitToken, setLivekitToken] = useState<string>("");
  const [competitionId, setCompetitionId] = useState<string>("");
  const [disconnectedModal, setDisconnectedModal] = useState<boolean>(false);
  const user = useUser();
  const router = useRouter();
  useEffect(() => {
    if (!livekitToken || !screenStream || !cameraStream) return;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    const sessionRef = rlDbRef(
      realtimeDb,
      `sessions/${competitionId}/${user?.uid}`,
    );
    let unsub: Unsubscribe | null = null;
    let heartbeat: NodeJS.Timeout | null = null;
    const disconnectListener = async () => {
      await room.disconnect();
    };
    (async () => {
      await room.connect(
        process.env.NEXT_PUBLIC_LIVEKIT_URL as string,
        livekitToken,
      );
      const [screenTrack] = screenStream?.getTracks() as MediaStreamTrack[];
      const [cameraTrack] = cameraStream?.getTracks() as MediaStreamTrack[];
      screenTrack.addEventListener("ended", async () => {
        await room.localParticipant.unpublishTracks([screenTrack, cameraTrack]);
      });
      cameraTrack.addEventListener("ended", async () => {
        await room.localParticipant.unpublishTracks([screenTrack, cameraTrack]);
      });
      await Promise.allSettled([
        screenTrack &&
          room.localParticipant.publishTrack(screenTrack, {
            name: "screen",
            source: Track.Source.ScreenShare,
          }),
        cameraTrack &&
          room.localParticipant.publishTrack(cameraTrack, {
            name: "camera",
            source: Track.Source.Camera,
          }),
      ]);

      await set(sessionRef, {
        status: "online",
        lastUpdated: serverTimestamp(),
      });
      console.log("here5555");

      unsub = onValue(sessionRef, async (snapshot) => {
        if (!snapshot.exists()) return;
        await onDisconnect(sessionRef).set({
          status: "offline",
          lastUpdate: serverTimestamp(),
        });
      });
      heartbeat = setInterval(() => {
        set(sessionRef, {
          status: "online",
          lastUpdated: serverTimestamp(),
        });
      }, 15 * 1000);
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("Connection:", state);
      });
      room.on(RoomEvent.Disconnected, async () => {
        setDisconnectedModal(true);
      });
      room.on(RoomEvent.LocalTrackUnpublished, () => {
        set(sessionRef, {
          status: "offline",
          lastUpdate: serverTimestamp(),
        });
        setDisconnectedModal(true);
      });
      router.push(`/student/${competitionId}`);
      window.addEventListener("offline", disconnectListener);
    })();
    return () => {
      (async () => {
        await room.removeAllListeners().disconnect(true);
        (unsub as Unsubscribe)?.();
        clearInterval(heartbeat as NodeJS.Timeout);
        cameraStream?.getTracks().forEach((track) => track.stop());
        screenStream?.getTracks().forEach((track) => track.stop());
        window.removeEventListener("offline", disconnectListener);
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livekitToken, competitionId, screenStream, cameraStream]);
  return (
    <userContext.Provider
      value={{
        screenStream,
        cameraStream,
        livekitToken,
        updateLivekitToken: setLivekitToken,
        competitionId,
        updateCompetitionId: setCompetitionId,
        setScreenStream,
        setCameraStream,
      }}
    >
      {children}
      <DisconnectedModal
        isOpen={disconnectedModal}
        onClose={() => {
          router.push("/student");
          setDisconnectedModal(false);
          setLivekitToken("");
          setCompetitionId("");
          setScreenStream(null);
          setCameraStream(null);
        }}
      />
    </userContext.Provider>
  );
}

export default StudentContext;

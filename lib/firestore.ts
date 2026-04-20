import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
//devmode import { db } from "./firebase";
import { db } from "@/app/firebase";
import { Incident } from "@october-math-community-circle/shared-utitilies";

// Log an incident to the room's subcollection
export const logIncident = async (
  roomId: string,
  incident: Omit<Incident, "id" | "timestamp" | "roomId">,
) => {
  try {
    const incidentsRef = collection(db, "rooms", roomId, "incidents");
    await addDoc(incidentsRef, {
      ...incident,
      roomId,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error logging incident", error);
  }
};

// Subscribe to incidents for the admin dashboard
export const subscribeToIncidents = (
  roomId: string,
  callback: (incidents: Incident[]) => void,
) => {
  const incidentsRef = collection(db, "rooms", roomId, "incidents");
  const q = query(incidentsRef, orderBy("timestamp", "desc"));

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const incidents: Incident[] = [];
    snapshot.forEach((doc: DocumentData) => {
      incidents.push({ id: doc.id, ...doc.data() } as Incident);
    });
    callback(incidents);
  });
};

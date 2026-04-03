"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { realtimeDb } from "@/app/firebase";

/**
 * Returns true if the student's session status is "blocked".
 * The proctor sets status = "blocked" in Realtime DB.
 */
export function useIsBlocked(competitionId: string, uid: string | undefined) {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (!uid || !competitionId) return;
    const sessionRef = ref(realtimeDb, `sessions/${competitionId}/${uid}`);
    const unsub = onValue(sessionRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();
      setIsBlocked(data?.status === "blocked");
    });
    return unsub;
  }, [competitionId, uid]);

  return isBlocked;
}

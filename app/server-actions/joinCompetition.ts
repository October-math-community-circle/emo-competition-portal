"use server";

import { db, realtimeDb } from "@/app/firebase-admin";
import { Competition } from "@october-math-community-circle/shared-utitilies/competition";
import { serverActionWrapperRESPONSE } from "@/lib/server/serverActionWrapper";
import getUser from "@/lib/server/getUser";
import { AccessToken } from "livekit-server-sdk";
import { Timestamp } from "firebase-admin/firestore";

const JOIN_WINDOW_MINUTES = 10;

async function joinCompetitionInternal(competitionId: string) {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  // ── 1. Competition must exist and be in progress ───────────────────────────
  const competitionDoc = await db
    .collection("competitions")
    .doc(competitionId)
    .get();
  if (!competitionDoc.exists) throw new Error("Competition doesn't exist");

  const competitionData = competitionDoc.data() as Competition;
  if (competitionData.status !== "in_progress")
    throw new Error("Competition is not currently in progress");

  // ── 2. Student must be registered ─────────────────────────────────────────
  const existingRegistration = await db
    .collection("registrations")
    .where("uid", "==", user.uid)
    .where("competitionId", "==", competitionId)
    .where("expired", "==", false)
    .limit(1)
    .get();

  if (existingRegistration.empty)
    throw new Error("You are not registered for this competition");

  // ── 3. 10-minute join window check ────────────────────────────────────────
  const startDate = (competitionData.startDate as Timestamp).toDate();
  const now = new Date();
  const minutesElapsed = (now.getTime() - startDate.getTime()) / 1000 / 60;

  if (minutesElapsed > JOIN_WINDOW_MINUTES) {
    throw new Error(
      `The join window has closed. Students may only join within the first ${JOIN_WINDOW_MINUTES} minutes of the competition.`,
    );
  }

  // ── 4. Once-only entry check ──────────────────────────────────────────────
  // If a session record already exists for this student, they joined before.
  // Status "online" means they're currently in — reject.
  // Status "offline" means they left — also reject (once-only rule).
  // Status "blocked" — also reject.
  const sessionRef = realtimeDb.ref(`sessions/${competitionId}/${user.uid}`);
  const sessionSnap = await sessionRef.get();

  if (sessionSnap.exists()) {
    const sessionData = sessionSnap.val() as { status: string };
    if (sessionData.status === "online") {
      throw new Error("You are already in this competition.");
    }
    // offline or blocked — they already entered once, deny re-entry
    throw new Error(
      "You have already entered this competition. Re-entry is not allowed.",
    );
  }

  // ── 5. All checks passed — generate LiveKit token ─────────────────────────
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: user.uid,
      metadata: JSON.stringify({ role: "student" }),
      name: user.email,
    },
  );
  at.addGrant({
    roomJoin: true,
    room: competitionId,
    canPublish: true,
    canSubscribe: false,
    canPublishData: true,
  });

  const token = await at.toJwt();
  return token;
}

export const joinCompetition = serverActionWrapperRESPONSE(
  joinCompetitionInternal,
  "",
  "Failed to join competition",
);

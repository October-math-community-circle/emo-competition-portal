"use server";

import { db } from "@/app/firebase-admin";
import { Competition } from "@october-math-community-circle/shared-utitilies/competition";
import { serverActionWrapperRESPONSE } from "@/lib/server/serverActionWrapper";
import getUser from "@/lib/server/getUser";
import { AccessToken } from "livekit-server-sdk";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

async function joinCompetitionInternal(competitionId: string) {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");
  if (user.role !== "student") throw new Error("Not authorized");

  const competitionDoc = await db.collection("competitions").doc(competitionId).get();
  if (!competitionDoc.exists) throw new Error("Competition doesn't exist");

  const competitionData = competitionDoc.data() as Competition;
  if (competitionData.status !== "in_progress") throw new Error("Competition hasn't started");

  const registrationSnap = await db
    .collection("registrations")
    .where("uid", "==", user.uid)
    .where("competitionId", "==", competitionId)
    .where("expired", "==", false)
    .limit(1)
    .get();

  if (registrationSnap.empty) throw new Error("You are not registered for this competition");

  const registrationDoc = registrationSnap.docs[0];
  const registration = registrationDoc.data();

  const joinDeadline = (competitionData.joinDeadline ?? competitionData.endDate) as Timestamp;
  const pastDeadline = joinDeadline && Timestamp.now().toMillis() > joinDeadline.toMillis();

  const shouldBlock =
    (registration.lockedOut === true && !registration.reEntryGranted) ||
    (pastDeadline && !registration.reEntryGranted);

  if (shouldBlock) {
    // Ensure proctor sees this student in the blocked list regardless of how they got here
    await db
      .collection("blockedStudents")
      .doc(`${competitionId}_${user.uid}`)
      .set({
        competitionId,
        studentUid: user.uid,
        blockedAt: FieldValue.serverTimestamp(),
        blockedBy: "system",
      }, { merge: true });

    await registrationDoc.ref.update({ lockedOut: true, reEntryGranted: false });
    throw new Error("The entry window has closed. You cannot re-enter this competition.");
  }

  // Past deadline but re-entry was granted — consume it atomically
  if (pastDeadline && registration.reEntryGranted) {
    await registrationDoc.ref.update({ reEntryGranted: false });
  }

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

  return at.toJwt();
}

export const joinCompetition = serverActionWrapperRESPONSE(
  joinCompetitionInternal,
  "",
  undefined,
);

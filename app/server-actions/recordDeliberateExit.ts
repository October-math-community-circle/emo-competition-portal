"use server";

import { db } from "@/app/firebase-admin";
import { serverActionWrapperRESPONSE } from "@/lib/server/serverActionWrapper";
import getUser from "@/lib/server/getUser";
import { FieldValue } from "firebase-admin/firestore";

async function recordDeliberateExitInternal(competitionId: string) {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const registrationSnap = await db
    .collection("registrations")
    .where("uid", "==", user.uid)
    .where("competitionId", "==", competitionId)
    .where("expired", "==", false)
    .limit(1)
    .get();

  if (registrationSnap.empty) return;

  await registrationSnap.docs[0].ref.update({
    lockedOut: true,
    reEntryGranted: false,
  });

  await db
    .collection("blockedStudents")
    .doc(`${competitionId}_${user.uid}`)
    .set({
      competitionId,
      studentUid: user.uid,
      blockedAt: FieldValue.serverTimestamp(),
      blockedBy: "system",
    });
}

export const recordDeliberateExit = serverActionWrapperRESPONSE(
  recordDeliberateExitInternal,
  undefined,
  "Failed to record exit",
);

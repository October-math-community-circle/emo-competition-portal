"use server";

import { db, realtimeDb } from "@/app/firebase-admin";
import { serverActionWrapperRESPONSE } from "@/lib/server/serverActionWrapper";
import getUser from "@/lib/server/getUser";
import { FieldValue,Timestamp } from "firebase-admin/firestore";

// ─── Block / Unblock a student ───────────────────────────────────────────────

async function blockStudentInternal(
  competitionId: string,
  studentUid: string,
) {
  const user = await getUser();
  if (user?.role !== "admin") throw new Error("Not authorized");

  // Mark the student's session as blocked in Realtime DB
  await realtimeDb
    .ref(`sessions/${competitionId}/${studentUid}`)
    .update({ status: "blocked" });

  // Also write a Firestore record so the UI can persist it
  await db
    .collection("blockedStudents")
    .doc(`${competitionId}_${studentUid}`)
    .set({
      competitionId,
      studentUid,
      blockedAt: FieldValue.serverTimestamp(),
      blockedBy: user.uid,
    });
}

async function unblockStudentInternal(
  competitionId: string,
  studentUid: string,
) {
  const user = await getUser();
  if (user?.role !== "admin") throw new Error("Not authorized");

  await realtimeDb
    .ref(`sessions/${competitionId}/${studentUid}`)
    .update({ status: "online" });

  await db
    .collection("blockedStudents")
    .doc(`${competitionId}_${studentUid}`)
    .delete();
}

// ─── Send announcement (to all students) ─────────────────────────────────────

async function sendAnnouncementInternal(
  competitionId: string,
  message: string,
) {
  const user = await getUser();
  if (user?.role !== "admin") throw new Error("Not authorized");

  await db.collection("messages").add({
    competitionId,
    type: "announcement",
    message,
    sentAt: FieldValue.serverTimestamp(),
    sentBy: user.uid,
    recipientUid: null, // null means all students
  });
}

// ─── Send private message (to one student) ───────────────────────────────────

async function sendPrivateMessageInternal(
  competitionId: string,
  recipientUid: string,
  message: string,
) {
  const user = await getUser();
  if (user?.role !== "admin") throw new Error("Not authorized");

  await db.collection("messages").add({
    competitionId,
    type: "private",
    message,
    sentAt: FieldValue.serverTimestamp(),
    sentBy: user.uid,
    recipientUid,
  });
}
// ─── Set join deadline for a competition ─────────────────────────────────────

async function setJoinDeadlineInternal(
  competitionId: string,
  deadlineISO: string,
) {
  const user = await getUser();
  if (user?.role !== "admin") throw new Error("Not authorized");

  const deadline = Timestamp.fromDate(new Date(deadlineISO));

  await db
    .collection("competitions")
    .doc(competitionId)
    .update({ joinDeadline: deadline });
}

// ─── Grant one-time re-entry to a locked-out student ─────────────────────────

async function grantReEntryInternal(
  competitionId: string,
  studentUid: string,
) {
  const user = await getUser();
  if (user?.role !== "admin") throw new Error("Not authorized");

  const registrationSnap = await db
    .collection("registrations")
    .where("uid", "==", studentUid)
    .where("competitionId", "==", competitionId)
    .where("expired", "==", false)
    .limit(1)
    .get();

  if (registrationSnap.empty) throw new Error("Registration not found");

  await registrationSnap.docs[0].ref.update({ reEntryGranted: true, lockedOut: false });

  // Remove from blockedStudents so useIsBlocked clears and join button re-enables
  await db
    .collection("blockedStudents")
    .doc(`${competitionId}_${studentUid}`)
    .delete();
}

export const blockStudent = serverActionWrapperRESPONSE(
  blockStudentInternal,
  undefined,
  "Failed to block student",
);

export const unblockStudent = serverActionWrapperRESPONSE(
  unblockStudentInternal,
  undefined,
  "Failed to unblock student",
);

export const sendAnnouncement = serverActionWrapperRESPONSE(
  sendAnnouncementInternal,
  undefined,
  "Failed to send announcement",
);

export const sendPrivateMessage = serverActionWrapperRESPONSE(
  sendPrivateMessageInternal,
  undefined,
  "Failed to send private message",
);
export const setJoinDeadline = serverActionWrapperRESPONSE(
  setJoinDeadlineInternal,
  undefined,
  "Failed to set join deadline",
);

export const grantReEntry = serverActionWrapperRESPONSE(
  grantReEntryInternal,
  undefined,
  "Failed to grant re-entry",
);

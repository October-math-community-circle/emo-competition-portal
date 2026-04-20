import { Metadata } from "next";
import { db } from "../firebase-admin";
import getUser from "@/lib/server/getUser";
import { Registration } from "@october-math-community-circle/shared-utitilies/registration";
import { Timestamp } from "firebase-admin/firestore";
import { Competition } from "@october-math-community-circle/shared-utitilies/competition";
import StudentPage from "./studentPage";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Student Dashboard",
  description: "Student Dashboard",
};
export const dynamic = "force-dynamic";
export default async function page() {
  const user = await getUser();

  // 🔒 Only students are allowed here — redirect admins to their own dashboard
  if (!user) redirect("/");
  if (user.role === "admin") redirect("/admin");

  const pendingRegistrations = (
    await db
      .collection("registrations")
      .where("expired", "==", false)
      .where("uid", "==", user.uid)
      .get()
  ).docs.map((doc) => {
    const data = doc.data() as Registration;
    return {
      ...data,
      id: doc.id,
      createdAt: (data.createdAt as Timestamp).toDate().toString(),
    };
  });

  const competitions = await Promise.all(
    pendingRegistrations.map((registration) =>
      db.collection("competitions").doc(registration.competitionId).get(),
    ),
  );

  const competitionsData = competitions
    .toSorted((a, b) => {
      const dataA = a.data() as Competition;
      const dataB = b.data() as Competition;
      return (
        (dataB.startDate as Timestamp).toMillis() -
        (dataA.startDate as Timestamp).toMillis()
      );
    })
    .filter((doc) => {
      const compData = doc.data() as Competition;
      // Only show competitions that are currently running
      return compData.status === "in_progress";
    })
    .map((doc) => {
      const data = doc.data() as Competition;
      return {
        ...data,
        id: doc.id,
        createdAt: (data.createdAt as Timestamp).toDate().toString(),
        startDate: (data.startDate as Timestamp).toDate().toString(),
        endDate: (data.endDate as Timestamp).toDate().toString(),
        joinDeadline: data.joinDeadline? (data.joinDeadline as Timestamp).toDate().toString(): null,
      };
    });
  const blockedCompetitions = (
    await db
      .collection("blockedStudents")
      .where("studentUid", "==", user.uid)
      .get()
  ).docs.map((doc) => {
    const blockingData = doc.data();
    return {
      competitionId: blockingData.competitionId,
      studentUid: blockingData.studentUid,
    };
  });
  return (
    <StudentPage
      registrations={pendingRegistrations}
      competitions={competitionsData}
      blockedCompetitions={blockedCompetitions}
    />
  );
}

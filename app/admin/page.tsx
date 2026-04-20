import { Metadata } from "next";
import { db } from "../firebase-admin";
import { Competition } from "@october-math-community-circle/shared-utitilies/competition";
import { Timestamp } from "firebase-admin/firestore";
import AdminPageClient from "./AdminPageClient";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin Dashboard",
};

export default async function AdminPage() {
  const competitionsDoc = await db
    .collection("competitions")
    .where("status", "==", "in_progress")
    .get();

  const competitionsData = competitionsDoc.docs
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
    })
    .sort(
      (a, b) =>
        new Date(b.startDate as string).getTime() -
        new Date(a.startDate as string).getTime(),
    );

  return <AdminPageClient competitions={competitionsData} />;
}

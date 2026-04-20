import { db, realtimeDb, storage } from "@/app/firebase-admin";
import getUser from "@/lib/server/getUser";
import { Competition } from "@october-math-community-circle/shared-utitilies/competition";
import { session } from "@october-math-community-circle/shared-utitilies/proctoring";
import { getDownloadURL } from "firebase-admin/storage";
import { notFound, redirect } from "next/navigation";
import ClientPage from "./clientPage";
import { Submission } from "@october-math-community-circle/shared-utitilies/submission";
import { Timestamp } from "firebase-admin/firestore";
import { CompetitionCountdown } from "./competitionCountdown";

async function page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();

  if (!user) return redirect("/");
  if (user.role !== "student") return redirect("/");
  const competitionDoc = await db.collection("competitions").doc(id).get();
  if (!competitionDoc.exists) return notFound();
  const competition = competitionDoc.data() as Competition;
  const sessionRef = realtimeDb.ref(`sessions/${id}/${user.uid}`);
  const session = await sessionRef.get();
  if (!session.exists()) return redirect("/");
  if ((session.toJSON() as session)?.status === "offline")
    return redirect("/student");
  let problemSheetDownloadURL = "";
  try {
    problemSheetDownloadURL = await getDownloadURL(
      storage.file(competition.problemSheetRef),
    );
  } catch {
    problemSheetDownloadURL = "https://www.w3.org/WAI/WCAG21/Techniques/pdf/pdf-sample.pdf";
  }

  const submissions: string[] = (
    await db.collection("submissions").where("uid", "==", user.uid).get()
  ).docs.map((submissionDoc) => {
    const submissionData = submissionDoc.data() as Submission;
    return submissionData.problemId;
  });
  return (
    <>
      <CompetitionCountdown
        endDate={(competition.endDate as Timestamp).toDate().toISOString()}
      />
      <ClientPage
        pdfUrl={problemSheetDownloadURL}
        problems={Object.entries(competition.problems)}
        competitionId={id}
        initialSubmissions={submissions}
      />
    </>
  );
}

export default page;

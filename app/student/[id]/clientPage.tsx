"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Submission } from "@october-math-community-circle/shared-utitilies/submission";
import {
  Competition,
  ProblemRef,
} from "@october-math-community-circle/shared-utitilies/competition";
import {
  Send,
  CheckCircle2,
  FileText,
  ListChecks,
  ChevronDown,
  Loader2,
  Ban,
} from "lucide-react";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/app/firebase";
import { useUser } from "@/app/hooks/useUser";
import EndedModal from "./endedModal";
import { useRouter } from "next/navigation";
import { useStreams } from "../useStreams";
import MessagesPanel from "./MessagesPanel";
import { useIsBlocked } from "@/app/hooks/useIsBlocked";

interface ClientPageProps {
  pdfUrl: string;
  problems: ProblemRef[];
  competitionId: string;
  initialSubmissions: string[];
}

type Tab = "submit" | "submissions";

export default function ClientPage({
  pdfUrl,
  problems,
  competitionId,
  initialSubmissions,
}: ClientPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("submit");
  const [submissions, setSubmissions] = useState<string[]>(initialSubmissions);
  const user = useUser();

  // ── Block detection ─────────────────────────────────────────────────────────
  const isBlocked = useIsBlocked(competitionId, user?.uid);

  const yupSchema = useMemo(() => {
    return yup.object({
      selectedProblem: yup
        .string()
        .required("Please select a problem")
        .oneOf(
          problems
            .filter(([problemId]) => !submissions.includes(problemId))
            .map(([problemId]) => problemId),
        ),
      answer: yup
        .number()
        .typeError("Please enter a valid number")
        .required("Please enter an answer"),
    });
  }, [problems, submissions]);

  const {
    handleSubmit,
    formState: { errors, touchedFields, isLoading, isValid },
    register,
    reset,
  } = useForm({
    resolver: yupResolver(yupSchema),
    mode: "onTouched",
    defaultValues: {
      selectedProblem: "",
    },
  });

  const submitAnswer = async (data: yup.InferType<typeof yupSchema>) => {
    if (isBlocked) return; // prevent submission while blocked
    try {
      await addDoc(collection(db, `submissions`), {
        problemId: data.selectedProblem,
        answer: data.answer,
        verdict: "pending",
        submittedAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        uid: user?.uid,
      });
    } catch (error) {
      console.log("submissionError ", error);
    } finally {
      reset();
    }
  };

  const [isCompetitionEnded, setIsCompetitionEnded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, "submissions"), where("uid", "==", user?.uid)),
      (snapshot) => {
        setSubmissions(
          snapshot.docs.map((doc) => (doc.data() as Submission).problemId),
        );
      },
    );
    const compUnSub = onSnapshot(
      doc(db, "competitions", competitionId),
      (snapshot) => {
        const compData = snapshot.data() as Competition;
        setIsCompetitionEnded(compData.status == "completed");
      },
    );
    return () => {
      unsub();
      compUnSub();
    };
  }, [user]);

  const router = useRouter();
  const {
    setCameraStream,
    setScreenStream,
    updateLivekitToken,
    updateCompetitionId,
  } = useStreams();

  return (
    <>
      <div className="flex h-screen w-full overflow-hidden bg-zinc-950">
        {/* PDF Viewer — Left Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 px-5 py-3 bg-zinc-900 border-b border-zinc-800">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-zinc-200">
              Problem Sheet
            </span>
          </div>
          <iframe
            src={pdfUrl}
            className="flex-1 w-full border-none bg-zinc-900"
            title="Problem Sheet PDF"
          />
        </div>

        {/* Right Sidebar */}
        <div className="w-95 shrink-0 flex flex-col border-l border-zinc-800 bg-zinc-900">
          {/* Tab Switcher */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("submit")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "submit"
                  ? "text-primary border-b-2 border-primary bg-zinc-800/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20"
              }`}
            >
              <Send className="w-4 h-4" />
              Submit Answer
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "submissions"
                  ? "text-primary border-b-2 border-primary bg-zinc-800/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20"
              }`}
            >
              <ListChecks className="w-4 h-4" />
              Submissions
              {submissions.length > 0 && (
                <span className="ml-1 bg-zinc-700 text-zinc-300 text-xs px-1.5 py-0.5 rounded-full">
                  {submissions.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === "submit" ? (
              <form onSubmit={handleSubmit(submitAnswer)} className="space-y-5">
                {/* Problem Selector */}
                <div className="space-y-2">
                  <div className="flex flex-col items-start gap-1">
                    <label className="text-sm font-medium text-zinc-300">
                      Select Problem
                    </label>
                    <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-400 mt-0.5">
                      Note: You can only submit one answer per problem.
                    </p>
                  </div>
                  <div className="relative">
                    <select
                      {...register("selectedProblem")}
                      disabled={isLoading || isBlocked}
                      className="w-full h-11 appearance-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 pr-10 text-sm text-zinc-200 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {problems.map(([problemId, title], index) => (
                        <option
                          disabled={submissions.includes(problemId)}
                          key={problemId}
                          value={problemId}
                        >
                          Problem {index + 1} — {title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  </div>
                  {touchedFields.selectedProblem &&
                    errors.selectedProblem?.message && (
                      <p className="text-red-500 text-sm">
                        {errors.selectedProblem.message}
                      </p>
                    )}
                </div>

                {/* Answer Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Your Answer
                  </label>
                  <Input
                    {...register("answer")}
                    type="number"
                    step="any"
                    placeholder="Enter your numerical answer"
                    disabled={isLoading || isBlocked}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                    error={
                      touchedFields.answer ? errors.answer?.message : undefined
                    }
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isLoading || !isValid || isBlocked}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Answer
                    </>
                  )}
                </Button>
              </form>
            ) : (
              /* Submissions Tab */
              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                    <ListChecks className="w-10 h-10 mb-3 opacity-30" />
                    <span className="text-sm font-medium">
                      No submissions yet
                    </span>
                    <span className="text-xs mt-1 text-zinc-600">
                      Submit an answer to see it here
                    </span>
                  </div>
                ) : (
                  submissions.map((problemId) => (
                    <div
                      key={problemId}
                      className="relative rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 transition-colors"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-emerald-500" />
                      <div className="pl-2">
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="truncate pr-2 text-sm font-semibold text-zinc-200">
                            {
                              problems.find(
                                (prob) => prob[0] === problemId,
                              )?.[1]
                            }
                          </span>
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400">
                            Answer submitted successfully
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Blocked overlay ────────────────────────────────────────────────────── */}
      {isBlocked && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-8 max-w-md text-center">
            <Ban className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Exam Access Blocked</h2>
            <p className="text-zinc-300 leading-relaxed">
              The proctor has temporarily blocked your access to this exam.
              Please wait or contact the proctor for assistance.
            </p>
          </div>
        </div>
      )}

      {/* ── Messages floating panel ────────────────────────────────────────────── */}
      {user?.uid && (
        <MessagesPanel competitionId={competitionId} uid={user.uid} />
      )}

      <EndedModal
        isOpen={isCompetitionEnded}
        onClose={() => {
          router.push("/student");
          setIsCompetitionEnded(false);
          setCameraStream(null);
          setScreenStream(null);
          updateLivekitToken("");
          updateCompetitionId("");
        }}
      />
    </>
  );
}

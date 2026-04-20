"use client";

import {
  Track,
  type Participant,
  type RemoteParticipant,
} from "livekit-client";
import ParticipantTile from "./ParticipantTile";
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  X,
  Send,
  MessageSquare,
  Clock,
  UserX,
  ShieldOff,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useParticipants, useTracks } from "@livekit/components-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/app/firebase";
import {
  blockStudent,
  unblockStudent,
  sendAnnouncement,
  sendPrivateMessage,
  setJoinDeadline,
  grantReEntry,
} from "@/app/server-actions/proctorActions";

export default function AdminGrid({
  competitionId,
}: {
  competitionId: string;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "blockedStudents"), where("competitionId", "==", competitionId)),
      (snapshot) => {
        setBlockedIds(new Set(snapshot.docs.map((d) => d.data().studentUid as string)));
      },
    );
    return () => unsub();
  }, [competitionId]);

  // Announcement modal
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");

  // Private message modal
  // identity = Firebase UID (LiveKit identity), name = display name
  const [pmTarget, setPmTarget] = useState<{
    identity: string;
    name: string;
  } | null>(null);
  const [pmText, setPmText] = useState("");

  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineMinutes, setDeadlineMinutes] = useState("");

  // "Pick a student" modal — shown when proctor clicks the message icon
  // in the header rather than on a specific tile
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  const [isPending, startTransition] = useTransition();

  const remoteParticipants = useParticipants({});
  const studentParticipants: Participant[] = [];
  remoteParticipants.forEach((participant) => {
    if (
      participant.metadata &&
      (JSON.parse(participant.metadata as string) as { role: string })
        ?.role === "student" &&
      (participant as RemoteParticipant).isActive
    ) {
      studentParticipants.push(participant);
    }
  });

  const totalPages = Math.max(
    1,
    Math.ceil(studentParticipants.length / itemsPerPage),
  );
  const validCurrentPage = Math.min(currentPage, totalPages);
  const trackRefs = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleBlock = (participantIdentity: string) => {
    startTransition(async () => {
      const isCurrentlyBlocked = blockedIds.has(participantIdentity);
      if (isCurrentlyBlocked) {
        await unblockStudent(competitionId, participantIdentity);
      } else {
        await blockStudent(competitionId, participantIdentity);
      }
    });
  };

  const openPrivateMessage = (identity: string, name: string) => {
    setPmTarget({ identity, name });
    setPmText("");
  };

  const handleSendAnnouncement = () => {
    if (!announcementText.trim()) return;
    startTransition(async () => {
      await sendAnnouncement(competitionId, announcementText.trim());
      setAnnouncementText("");
      setShowAnnouncement(false);
    });
  };

  const handleSendPrivateMessage = () => {
    if (!pmText.trim() || !pmTarget) return;
    startTransition(async () => {
      // pmTarget.identity is the student's Firebase UID — set as LiveKit identity in joinCompetition.ts
      await sendPrivateMessage(competitionId, pmTarget.identity, pmText.trim());
      setPmText("");
      setPmTarget(null);
    });
  };
  const handleSetDeadline = () => {
  const mins = parseInt(deadlineMinutes);
  if (isNaN(mins) || mins <= 0) return;
  const deadline = new Date(Date.now() + mins * 60 * 1000).toISOString();
    startTransition(async () => {
      await setJoinDeadline(competitionId, deadline);
      setDeadlineMinutes("");
      setShowDeadlineModal(false);
    });
  };

  const handleGrantReEntry = (participantIdentity: string) => {
    startTransition(async () => {
      await grantReEntry(competitionId, participantIdentity);
    });
  };
  const handleUnblockFromModal = (participantIdentity: string) => {
    startTransition(async () => {
      await grantReEntry(competitionId, participantIdentity);
    });
  };
  const blockedModal = showBlockedModal && (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2 text-red-400 font-bold text-lg">
                <UserX className="w-5 h-5" />
                Blocked Students
              </div>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto space-y-1">
              {blockedIds.size === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">No blocked students</p>
              ) : (
                [...blockedIds].map((identity) => {
                  const participant = studentParticipants.find(
                    (p) => p.identity === identity,
                  );
                  const displayName = participant?.name || identity;
                  return (
                    <div
                      key={identity}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-800 text-white text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-600/30 flex items-center justify-center text-red-300 font-bold text-xs shrink-0">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{displayName}</span>
                      </div>
                      <button
                        onClick={() => handleUnblockFromModal(identity)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                      >
                        <ShieldOff className="w-3.5 h-3.5" />
                        Unblock
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
    </div>
  );


  // ── Empty state ──────────────────────────────────────────────────────────────

  if (studentParticipants.length === 0) {
    return (
      <>
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-950 p-8 h-full">
          <div className="flex flex-col items-center gap-4">
            <Users className="w-16 h-16 opacity-20" />
            <h2 className="text-xl font-medium">Waiting for Contestants</h2>
            <p className="mt-2 text-sm text-gray-600 text-center max-w-sm">
              No contestants have joined this room yet. When they join, their
              streams will appear here automatically.
            </p>
            <button
              onClick={() => setShowBlockedModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-white text-sm font-semibold transition-colors mt-4"
            >
              <UserX className="w-4 h-4" />
              Blocked ({blockedIds.size})
            </button>
          </div>
        </div>
        {blockedModal}
      </>
    );
  }


  const paginatedParticipants = studentParticipants.slice(
    (validCurrentPage - 1) * itemsPerPage,
    validCurrentPage * itemsPerPage,
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-auto bg-gray-950 p-6 h-full">
        {/* Header row */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Active Contestants ({studentParticipants.length})
            {blockedIds.size > 0 && (
              <span className="ml-2 text-sm font-normal text-red-400">
                ({blockedIds.size} blocked)
              </span>
            )}
          </h2>

          <div className="flex items-center gap-2">
            {/* Private message — pick a student */}
            <button
              onClick={() => setShowStudentPicker(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Message Student
            </button>

            {/* Announcement to all */}
            <button
              onClick={() => setShowAnnouncement(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
            >
              <Megaphone className="w-4 h-4" />
              Announce to All
            </button>
            <button
              onClick={() => setShowDeadlineModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
            >
              <Clock className="w-4 h-4" />
              Set Join Deadline
            </button>
            <button onClick={() => setShowBlockedModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
              <UserX className="w-4 h-4" />
              Blocked ({blockedIds.size})
            </button>



            {/* Pagination */}
            {studentParticipants.length > itemsPerPage && (
              <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1.5 border border-gray-800">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={validCurrentPage === 1}
                  className="flex items-center px-3 py-1.5 text-sm font-medium bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </button>
                <span className="text-sm font-medium text-gray-300 min-w-16 text-center">
                  {validCurrentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={validCurrentPage === totalPages}
                  className="flex items-center px-3 py-1.5 text-sm font-medium bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max flex-1 content-start">
          {paginatedParticipants.map((participant: Participant) => (
            <ParticipantTile
              key={participant.identity}
              participant={participant}
              trackRefs={trackRefs.filter(
                (ref) => ref.participant.identity === participant.identity,
              )}
              isBlocked={blockedIds.has(participant.identity)}
              onBlock={handleBlock}
              onPrivateMessage={openPrivateMessage}
              onGrantReEntry={handleGrantReEntry}
            />
          ))}
        </div>
      </div>

      {/* ── Student Picker Modal (for "Message Student" button) ─────────────── */}
      {showStudentPicker && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-lg">
                <MessageSquare className="w-5 h-5" />
                Select Student
              </div>
              <button
                onClick={() => setShowStudentPicker(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto space-y-1">
              {studentParticipants.map((p) => (
                <button
                  key={p.identity}
                  onClick={() => {
                    openPrivateMessage(
                      p.identity,
                      p.name || p.identity,
                    );
                    setShowStudentPicker(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-300 font-bold text-xs shrink-0">
                    {(p.name || p.identity).charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{p.name || p.identity}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Announcement Modal ───────────────────────────────────────────────── */}
      {showAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-lg">
                <Megaphone className="w-5 h-5" />
                Send Announcement
              </div>
              <button
                onClick={() => setShowAnnouncement(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-400 mb-3">
                This message will be visible to{" "}
                <span className="text-white font-semibold">all students</span>{" "}
                in the competition.
              </p>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Type your announcement..."
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
              />
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={() => setShowAnnouncement(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendAnnouncement}
                disabled={!announcementText.trim() || isPending}
                className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send to All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Private Message Modal ────────────────────────────────────────────── */}
      {pmTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-lg">
                <Send className="w-5 h-5" />
                Private Message
              </div>
              <button
                onClick={() => setPmTarget(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-400 mb-3">
                Sending privately to:{" "}
                <span className="text-white font-semibold">
                  {pmTarget.name}
                </span>
              </p>
              <textarea
                value={pmText}
                onChange={(e) => setPmText(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={() => setPmTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendPrivateMessage}
                disabled={!pmText.trim() || isPending}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Set Join Deadline Modal ─────────────────────────────────────────── */}
      {showDeadlineModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                <Clock className="w-5 h-5" />
                Set Join Deadline
              </div>
              <button
                onClick={() => setShowDeadlineModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-400 mb-3">
                Students will have this many minutes from <span className="text-white font-semibold">now</span> to join. After that, deliberate exits are permanent.
              </p>
              <input
                type="number"
                min={1}
                value={deadlineMinutes}
                onChange={(e) => setDeadlineMinutes(e.target.value)}
                placeholder="e.g. 30"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={() => setShowDeadlineModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetDeadline}
                disabled={!deadlineMinutes.trim() || isPending}
                className="flex-1 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Set Deadline
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Blocked Students Modal ──────────────────────────────────────────── */}
      {blockedModal}


    </>
  );
}

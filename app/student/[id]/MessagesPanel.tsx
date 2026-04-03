"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/firebase";
import { Bell, MessageSquare, X } from "lucide-react";

interface Message {
  id: string;
  type: "announcement" | "private";
  message: string;
  sentAt: Timestamp | null;
}

export default function MessagesPanel({
  competitionId,
  uid,
}: {
  competitionId: string;
  uid: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!uid) return;

    // Listen for announcements (recipientUid == null means all students)
    const announcementQuery = query(
      collection(db, "messages"),
      where("competitionId", "==", competitionId),
      where("type", "==", "announcement"),
      orderBy("sentAt", "desc"),
    );

    // Listen for private messages addressed to this student
    const privateQuery = query(
      collection(db, "messages"),
      where("competitionId", "==", competitionId),
      where("type", "==", "private"),
      where("recipientUid", "==", uid),
      orderBy("sentAt", "desc"),
    );

    const combined: Record<string, Message> = {};

    const updateMessages = () => {
      const sorted = Object.values(combined).sort((a, b) => {
        const aTime = a.sentAt?.toMillis() ?? 0;
        const bTime = b.sentAt?.toMillis() ?? 0;
        return bTime - aTime;
      });
      setMessages(sorted);
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const unsubAnn = onSnapshot(announcementQuery, (snap) => {
      snap.docs.forEach((doc) => {
        combined[doc.id] = { id: doc.id, ...(doc.data() as Omit<Message, "id">) };
      });
      updateMessages();
    });

    const unsubPm = onSnapshot(privateQuery, (snap) => {
      snap.docs.forEach((doc) => {
        combined[doc.id] = { id: doc.id, ...(doc.data() as Omit<Message, "id">) };
      });
      updateMessages();
    });

    return () => {
      unsubAnn();
      unsubPm();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId, uid]);

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 transition-colors"
      >
        <Bell className="w-5 h-5" />
        <span className="text-sm font-semibold">Messages</span>
        {unreadCount > 0 && (
          <span className="ml-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Slide-in panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[70vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-white font-bold">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                Messages from Proctor
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <Bell className="w-8 h-8 mb-2 opacity-30" />
                  <span className="text-sm">No messages yet</span>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-3.5 border ${
                      msg.type === "announcement"
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-blue-500/10 border-blue-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {msg.type === "announcement" ? (
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      )}
                      <span
                        className={`text-xs font-bold uppercase tracking-wide ${
                          msg.type === "announcement"
                            ? "text-amber-400"
                            : "text-blue-400"
                        }`}
                      >
                        {msg.type === "announcement"
                          ? "Announcement"
                          : "Private Message"}
                      </span>
                      {msg.sentAt && (
                        <span className="ml-auto text-xs text-zinc-500">
                          {msg.sentAt.toDate().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed">
                      {msg.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

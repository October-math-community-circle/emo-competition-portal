"use client";

import Link from "next/link";
import { Button } from "./Button";
import { useUser } from "@/app/hooks/useUser";
import { signOut } from "firebase/auth";
import { auth } from "@/app/firebase";

export function Navbar() {
  const user = useUser();

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all 
        duration-300 border-b bg-white border-transparent`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-2.5">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div
                className={`relative overflow-hidden rounded-full border-2 transition-all duration-300  
                  h-12 w-12 border-primary/10`}
              >
                {/* Logo Image logic if any */}
              </div>
              <div className="flex flex-col">
                <span
                  className={`font-black tracking-tighter 
                    text-foreground transition-all 
                    duration-300 text-2xl invisible`}
                >
                  EMF
                </span>
                <span
                  className={`font-bold tracking-widest uppercase 
                    text-black -mt-1 transition-all duration-300
                     text-[0.6rem] invisible`}
                >
                  Egypt Mathematical Foundation
                </span>
              </div>
            </Link>
          </div>

          {/* Action Button Section */}
          <div className="flex items-center gap-4">
            {/* Exam Button */}
            <Link
              href="https://emo-competition-portal.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="exam-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 18px 7px 14px",
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
                color: "#e2c97e",
                fontWeight: 700,
                fontSize: "0.82rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                textDecoration: "none",
                boxShadow: "0 2px 16px 0 rgba(15,52,96,0.18)",
                transition: "all 0.2s ease",
                border: "none",
                position: "relative",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background =
                  "linear-gradient(135deg, #0f3460 0%, #16213e 60%, #e2c97e 200%)";
                (e.currentTarget as HTMLElement).style.color = "#fff";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 4px 24px 0 rgba(226,201,126,0.22)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background =
                  "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)";
                (e.currentTarget as HTMLElement).style.color = "#e2c97e";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 2px 16px 0 rgba(15,52,96,0.18)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              {/* Pencil icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Exam
            </Link>

            {user ? (
              <Button
                onClick={async () => {
                  await signOut(auth);
                }}
                variant="outline"
                size={"md"}
                className={`w-full justify-center`}
              >
                sign out
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}

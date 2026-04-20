"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Competition } from "@october-math-community-circle/shared-utitilies/competition";
import { Countdown } from "./Countdown";
import { JoinButton } from "./JoinButton";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { useIsBlocked } from "@/app/hooks/useIsBlocked";
import { useUser } from "@/app/hooks/useUser";

interface CompetitionCardProps {
  competition: Competition;
  isJoined: boolean;
  isBlocked: boolean;
}

export function CompetitionCard({
  competition,
  isJoined,
  isBlocked,
}: CompetitionCardProps) {
  const startDate = new Date(competition.startDate as string);
  const endDate = new Date(competition.endDate as string);

  // Calculate duration in hours
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationHours = Math.round(durationMs / (1000 * 60 * 60));

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const user = useUser();
  const liveIsBlocked = useIsBlocked(competition.id!, user?.uid);
  const blocked = user ? liveIsBlocked : isBlocked;
        

  return (
    <Card className="overflow-hidden border-border/50 bg-linear-to-b from-card to-background/50 transition-all hover:border-primary/20 hover:shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            {competition.title}
          </CardTitle>
          {isJoined && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Registered
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {competition.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary/70" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">Timeline</span>
              <span className="text-xs">
                {formatDate(startDate)} - {formatDate(endDate)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary/70" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">Duration</span>
                <span className="text-xs">{durationHours} Hours</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary/70" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">Location</span>
                <span className="text-xs">{competition.location}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary/70" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">Participants</span>
              <span className="text-xs">
                {competition.maxParticipants
                  ? `${competition.maxParticipants} slots available`
                  : "Unrestricted access"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-primary/5 p-4 text-center">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {competition.status === "in_progress" ? "Ends in" : "Starts in"}
          </p>
          <div className="flex justify-center">
            <Countdown
              startDate={competition.startDate as string}
              endDate={competition.endDate as string}
              status={competition.status}
            />
          </div>
        </div>

        <JoinButton
          competitionId={competition.id!}
          isJoined={isJoined}
          status={competition.status}
          isBlocked={blocked}
        />
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DisplayNameBadge } from "@/components/DisplayNameBadge";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { CodeInput } from "@/components/CodeInput";
import { TextBlurReveal } from "@/components/wensity/text-blur-reveal";
import { TextShimmer } from "@/components/wensity/text-shimmer";
import { useCreateRoom, useJoinRoom, useJoinedRooms } from "@/hooks/useRooms";
import { roomPath, timeLeftLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Turn API error messages into something a person can act on. */
function joinErrorMessage(err: unknown): string {
  const msg = (err as Error)?.message ?? "";
  if (/not found/i.test(msg)) return "No room uses that code. Check it with whoever shared it.";
  if (/expired/i.test(msg)) return "That room has closed.";
  return "Couldn't join the room. Try again.";
}

export default function Index() {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  // Re-render the "x min left" labels every 30 s
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: joinedRoomsData, isLoading: roomsLoading, isError: roomsError } = useJoinedRooms(false);
  const createRoomMutation = useCreateRoom();
  const joinRoomMutation = useJoinRoom();
  const rooms = joinedRoomsData?.rooms ?? [];

  const handleCreateRoom = async (name: string) => {
    try {
      const room = await createRoomMutation.mutateAsync(name || undefined);
      setIsCreateOpen(false);
      router.push(roomPath(room));
    } catch (err) {
      toast.error((err as Error).message || "Couldn't create the room. Try again.");
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setJoinError(null);
    try {
      const room = await joinRoomMutation.mutateAsync(code);
      router.push(roomPath(room));
    } catch (err) {
      setJoinError(joinErrorMessage(err));
    }
  };

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <span className="text-[17px] font-semibold tracking-tight">FastShare</span>
        <div className="flex items-center gap-1">
          <DisplayNameBadge />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        {/* Hero: what this is + the two ways in */}
        <section className="grid gap-10 border-b pb-14 pt-10 sm:pt-16 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-16">
          <div>
            {/* The page's one orchestrated moment: the promise settles into place */}
            <TextBlurReveal
              as="h1"
              text="Private rooms that close themselves."
              startOnView={false}
              delay={70}
              stepDuration={0.3}
              className="text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[3.5rem]"
            />
            <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-muted-foreground">
              Chat and share files with anyone who has the code. A room closes after 50 minutes
              unless its owner adds time, and everything inside is deleted.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6">
            <form onSubmit={handleJoin} className="space-y-3">
              <label htmlFor="room-code" className="text-sm font-medium">
                Join with a code
              </label>
              <CodeInput
                id="room-code"
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setJoinError(null);
                }}
                invalid={!!joinError}
              />
              {joinError && (
                <p role="alert" className="text-sm text-destructive">
                  {joinError}
                </p>
              )}
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={code.length !== 6 || joinRoomMutation.isPending}
              >
                {joinRoomMutation.isPending ? (
                  <TextShimmer
                    text="Joining…"
                    duration={1.4}
                    baseColor="hsl(var(--primary-foreground) / 0.55)"
                    shimmerColor="hsl(var(--primary-foreground))"
                  />
                ) : (
                  "Join room"
                )}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="h-11 w-full" onClick={() => setIsCreateOpen(true)}>
              Create a room
            </Button>
          </div>
        </section>

        {/* Joined rooms */}
        <section className="pt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Your rooms</h2>
            {rooms.length > 0 && (
              <span className="text-sm tabular-nums text-muted-foreground">{rooms.length} open</span>
            )}
          </div>

          {roomsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : roomsError ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Couldn&apos;t load your rooms. Refresh the page to try again.
            </p>
          ) : rooms.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Rooms you create or join show up here until they close.
            </p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {rooms.map((room) => {
                const left = room.expires_at - now;
                return (
                  <li key={room.code}>
                    <button
                      onClick={() => router.push(roomPath(room))}
                      className="group grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_7rem_6rem_9rem_auto] sm:px-5"
                    >
                      <span className="truncate font-medium">{room.name}</span>
                      <span className="hidden font-mono text-sm text-muted-foreground sm:block">
                        {room.code}
                      </span>
                      <span className="hidden text-sm text-muted-foreground sm:block">
                        {room.owner ? "Owner" : "Member"}
                      </span>
                      <span
                        className={cn(
                          "row-span-2 text-right text-sm tabular-nums sm:row-span-1 sm:text-left",
                          left < 300 ? "text-warning" : "text-muted-foreground"
                        )}
                      >
                        {timeLeftLabel(room.expires_at, now)}
                      </span>
                      <span className="text-xs text-muted-foreground sm:hidden">
                        <span className="font-mono">{room.code}</span>
                        {room.owner ? ", owner" : ""}
                      </span>
                      <ChevronRight className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateRoom={handleCreateRoom}
        loading={createRoomMutation.isPending}
      />
    </div>
  );
}

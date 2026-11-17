"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, isToday, isYesterday } from "date-fns";
import { ArrowLeft, Copy, Check, ArrowUp, ChevronDown, ArrowDown, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DisplayNameBadge } from "@/components/DisplayNameBadge";
import { ChatMessage } from "@/components/ChatMessage";
import { FilesPanel } from "@/components/FilesPanel";
import { Avatar } from "@/components/Avatar";

import { useDisplayName } from "@/contexts/DisplayNameContext";
import { useRoomDetail, useDeleteRoom, useExtendRoom, useJoinRoom } from "@/hooks/useRooms";
import { useRoomMessages, useSendMessage, useUpdateMessage, useDeleteMessage } from "@/hooks/useMessages";
import { useRoomFiles, useUploadFile, useDeleteFile, useDownloadFile } from "@/hooks/useFiles";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { useQueryClient } from "@tanstack/react-query";
import { TextShimmer } from "@/components/wensity/text-shimmer";
import { sanitizeMessageHtml } from "@/lib/sanitize";
import { formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";

type Panel = "chat" | "files" | "people";

const EXTEND_OPTIONS = [
  { label: "Add 15 minutes", minutes: 15 },
  { label: "Add 30 minutes", minutes: 30 },
  { label: "Add 1 hour", minutes: 60 },
] as const;

const dayLabel = (date: Date) =>
  isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "EEEE, MMMM d");

export default function RoomView() {
  const params = useParams<{ roomName: string; roomCode: string }>();
  const roomCode = params?.roomCode ?? "";
  const urlName = params?.roomName ? decodeURIComponent(params.roomName).replace(/-/g, " ") : "";
  const router = useRouter();

  const [panel, setPanel] = useState<Panel>("chat");
  const [composerEmpty, setComposerEmpty] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const prevMsgCountRef = useRef(0);

  const { displayName } = useDisplayName();
  const { data: room, error: roomError, isLoading: roomLoading, refetch: refetchRoom } = useRoomDetail(roomCode || undefined);
  const deleteRoomMutation = useDeleteRoom();
  const extendRoomMutation = useExtendRoom();
  const joinRoomMutation = useJoinRoom();

  const closed = !!room && (room.expired || timeLeft === 0);
  // Only load messages/files once we know we're a member of an open room
  const activeCode = room && !closed ? roomCode : "";
  const myMemberId = room?.members.find((m) => m.me)?.id;
  const me = useMemo(() => (myMemberId != null ? { id: myMemberId, name: displayName } : null), [myMemberId, displayName]);

  const queryClient = useQueryClient();
  const refreshFiles = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["rooms", roomCode, "files"] }),
    [queryClient, roomCode]
  );

  // Realtime: instant signals, presence and typing; polling only as a fallback while disconnected.
  // (Handlers run after render, so they can use fetchNewer/resync declared just below.)
  const realtime = useRoomRealtime(closed ? undefined : room?.realtime_key, me, {
    onMessages: (s) => (s.op === "insert" ? fetchNewer() : resync()),
    onFiles: refreshFiles,
    onRoom: (s) => {
      if (s.op === "delete") {
        toast("The owner deleted this room");
        router.push("/");
      } else refetchRoom();
    },
    onConnected: () => {
      fetchNewer();
      refreshFiles();
      refetchRoom();
    },
  });
  const live = realtime.connected;
  const messagesQuery = useRoomMessages(activeCode, { live });
  const { fetchNewer, resync } = messagesQuery;

  const typers = realtime.typingNames;
  const typingLabel =
    typers.length === 0
      ? ""
      : typers.length === 1
        ? `${typers[0]} is typing…`
        : typers.length === 2
          ? `${typers[0]} and ${typers[1]} are typing…`
          : "Several people are typing…";

  const { data: messagesData, isLoading: messagesLoading } = messagesQuery;
  const sendMessageMutation = useSendMessage(roomCode, me);
  const updateMessageMutation = useUpdateMessage(roomCode);
  const deleteMessageMutation = useDeleteMessage(roomCode);
  const messages = useMemo(() => messagesData?.messages ?? [], [messagesData]);

  const { data: filesData, isLoading: filesLoading } = useRoomFiles(activeCode, { live });
  const uploadFileMutation = useUploadFile(roomCode);
  const deleteFileMutation = useDeleteFile(roomCode);
  const downloadFile = useDownloadFile();
  const files = filesData?.files ?? [];

  /* ---------- Countdown ---------- */

  useEffect(() => {
    if (room?.expires_at == null) return;
    const update = () => setTimeLeft(Math.max(0, room.expires_at - Math.floor(Date.now() / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [room?.expires_at]);

  const lifetime = room ? Math.max(1, room.expires_at - room.created_at) : 1;
  const remainingRatio = timeLeft == null ? 1 : Math.min(1, timeLeft / lifetime);
  const lowTime = timeLeft != null && timeLeft > 0 && timeLeft <= 300;

  /* ---------- Auto-scroll: follow new messages only when already at the bottom ---------- */

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    atBottomRef.current = true;
    setShowScrollButton(false);
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distance < 80;
    setShowScrollButton(distance > 240);
  }, []);

  useEffect(() => {
    const count = messages.length;
    const prev = prevMsgCountRef.current;
    prevMsgCountRef.current = count;
    if (count === 0) return;
    if (prev === 0) scrollToBottom("auto");
    else if (count > prev && atBottomRef.current) scrollToBottom("smooth");
  }, [messages.length, scrollToBottom]);

  // Returning to the chat tab on mobile: land on the latest message
  useEffect(() => {
    if (panel === "chat") requestAnimationFrame(() => scrollToBottom("auto"));
  }, [panel, scrollToBottom]);

  /* ---------- Actions ---------- */

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success("Room code copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleComposerInput = () => {
    const empty = !(composerRef.current?.innerText?.trim().length ?? 0);
    setComposerEmpty(empty);
    if (empty) realtime.notifyStoppedTyping();
    else realtime.notifyTyping();
  };

  const handleComposerPaste = (e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData("text/html");
    if (html) {
      e.preventDefault();
      document.execCommand("insertHTML", false, sanitizeMessageHtml(html));
      handleComposerInput();
    }
  };

  const handleSendMessage = () => {
    const raw = composerRef.current?.innerHTML.trim() ?? "";
    if (!raw || raw === "<br>" || composerEmpty) return;
    const content = sanitizeMessageHtml(raw);
    // Optimistic: clear the composer and show the message right away
    if (composerRef.current) composerRef.current.innerHTML = "";
    setComposerEmpty(true);
    realtime.notifyStoppedTyping();
    requestAnimationFrame(() => scrollToBottom("smooth"));
    sendMessageMutation.mutate(content, {
      onError: (err) => {
        toast.error(`Message not sent: ${err.message}`);
        // Give the text back so nothing is lost
        if (composerRef.current && !composerRef.current.innerText.trim()) {
          composerRef.current.innerHTML = content;
          setComposerEmpty(false);
        }
      },
    });
  };

  const run = (fn: () => Promise<unknown>, success: string) => async () => {
    try {
      await fn();
      toast.success(success);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      await uploadFileMutation.mutateAsync(file);
      toast.success(`Uploaded ${file.name}`);
    } catch (err) {
      toast.error((err as Error).message || "Upload failed. Try again.");
    }
  };

  const handleDeleteRoom = async () => {
    try {
      await deleteRoomMutation.mutateAsync(roomCode);
      setDeleteDialogOpen(false);
      toast.success("Room deleted");
      router.push("/");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleJoin = async () => {
    try {
      await joinRoomMutation.mutateAsync(roomCode);
      await refetchRoom();
    } catch (err) {
      toast.error(/expired/i.test((err as Error).message) ? "That room has closed." : (err as Error).message);
    }
  };

  /* ---------- Messages with day separators + sender grouping ---------- */

  type ChatItem =
    | { kind: "separator"; key: string; label: string }
    | { kind: "message"; key: string; msg: (typeof messages)[number]; grouped: boolean };

  const chatItems = useMemo<ChatItem[]>(() => {
    const items: ChatItem[] = [];
    let prev: (typeof messages)[number] | null = null;
    for (const msg of messages) {
      const date = new Date(msg.created_at * 1000);
      const newDay = !prev || new Date(prev.created_at * 1000).toDateString() !== date.toDateString();
      if (newDay) items.push({ kind: "separator", key: `sep-${msg.id}`, label: dayLabel(date) });
      const grouped = !newDay && !!prev && prev.sender_client_id === msg.sender_client_id && msg.created_at - prev.created_at < 300;
      items.push({ kind: "message", key: String(msg.id), msg, grouped });
      prev = msg;
    }
    return items;
  }, [messages]);

  /* ---------- Not a member / missing room ---------- */

  if (roomError && !room) {
    const notMember = /not a room member/i.test(roomError.message);
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-14 items-center justify-between border-b px-2 sm:px-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft />
            All rooms
          </Button>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm text-center">
            {notMember ? (
              <>
                <h1 className="text-xl font-semibold tracking-tight">Join {urlName || "this room"}?</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  You&apos;ll appear as <span className="font-medium text-foreground">{displayName}</span>. Everyone in the room
                  can see your messages and files.
                </p>
                <p className="mt-4 font-mono text-lg tracking-[0.2em]">{roomCode}</p>
                <Button className="mt-6 h-11 w-full" onClick={handleJoin} disabled={joinRoomMutation.isPending}>
                  {joinRoomMutation.isPending ? "Joining…" : "Join room"}
                </Button>
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold tracking-tight">This room isn&apos;t available</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  It may have closed or been deleted by its owner. Ask for a new code to join another room.
                </p>
                <Button variant="outline" className="mt-6 h-11 w-full" onClick={() => router.push("/")}>
                  Back to your rooms
                </Button>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  const roomName = room?.name ?? urlName;
  const isOwner = !!room?.owner;

  const timer = (
    <span className={cn("font-mono text-sm tabular-nums", lowTime && "text-warning", closed && "text-destructive")}>
      {closed ? "Closed" : timeLeft != null ? formatCountdown(timeLeft) : "--:--"}
      {!closed && <span className="ml-1 hidden font-sans text-muted-foreground sm:inline">left</span>}
    </span>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b bg-background">
        <div className="flex h-14 items-center gap-1 px-2 sm:gap-2 sm:px-4">
          <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => router.push("/")} aria-label="All rooms">
            <ArrowLeft />
          </Button>

          <div className="min-w-0 flex-1">
            {roomLoading && !room ? (
              <Skeleton className="h-4 w-36" />
            ) : (
              <h1 className="truncate text-[15px] font-semibold leading-tight" title={roomName}>
                {roomName}
              </h1>
            )}
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 rounded font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Room code ${roomCode}. Copy`}
            >
              {roomCode}
              {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
            </button>
          </div>

          {isOwner && !closed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-1 px-2.5" aria-label="Room time and options">
                  {timer}
                  <ChevronDown className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Keep the room open</DropdownMenuLabel>
                {EXTEND_OPTIONS.map(({ label, minutes }) => (
                  <DropdownMenuItem
                    key={minutes}
                    disabled={extendRoomMutation.isPending}
                    onClick={run(() => extendRoomMutation.mutateAsync({ code: roomCode, minutes }), `Added ${minutes === 60 ? "1 hour" : `${minutes} minutes`}`)}
                  >
                    <Plus className="mr-2 size-4" />
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 size-4" />
                  Delete room…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="px-2.5" aria-label="Time left">
              {timer}
            </span>
          )}

          <div className="hidden sm:block">
            <DisplayNameBadge />
          </div>
          <ThemeToggle />
        </div>

        {/* Time remaining: drains from full to empty over the room's lifetime */}
        <div className="h-0.5 bg-border" role="progressbar" aria-label="Time left in this room" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(remainingRatio * 100)}>
          <div
            className={cn("h-full transition-[width] duration-1000 ease-linear", closed ? "bg-destructive" : lowTime ? "bg-warning" : "bg-foreground")}
            style={{ width: `${remainingRatio * 100}%` }}
          />
        </div>

        {/* Mobile panels */}
        <nav className="grid grid-cols-3 lg:hidden" aria-label="Room sections">
          {(
            [
              ["chat", "Chat", null],
              ["files", "Files", files.length],
              ["people", "People", room?.member_count ?? 0],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setPanel(key)}
              aria-current={panel === key ? "page" : undefined}
              className={cn(
                "relative h-11 text-sm font-medium text-muted-foreground transition-colors",
                panel === key && "text-foreground after:absolute after:inset-x-6 after:bottom-0 after:h-0.5 after:bg-foreground"
              )}
            >
              {label}
              {count ? <span className="ml-1 tabular-nums text-muted-foreground">{count}</span> : null}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Chat */}
        <section aria-label="Chat" className={cn("relative min-w-0 flex-1 flex-col", panel === "chat" ? "flex" : "hidden lg:flex")}>
          {closed && (
            <div className="border-b bg-card px-4 py-3 text-sm" role="status">
              <span className="font-medium">This room has closed.</span>{" "}
              <span className="text-muted-foreground">Its messages and files have been removed.</span>
            </div>
          )}

          <div ref={scrollContainerRef} onScroll={handleMessagesScroll} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-3 py-5 sm:px-6">
              {messagesLoading && messages.length === 0 ? (
                <div className="space-y-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={cn("flex gap-2.5", i === 1 && "flex-row-reverse")}>
                      {i !== 1 && <Skeleton className="size-8 rounded-full" />}
                      <Skeleton className="h-10 w-56 rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 && !closed && room ? (
                <div className="m-auto flex max-w-sm flex-col items-center py-10 text-center">
                  <p className="font-medium">No messages yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Invite people with this code. Everything here is deleted when the room closes.
                  </p>
                  <button
                    onClick={handleCopyCode}
                    className="mt-5 rounded-xl border bg-card px-5 py-3 font-mono text-2xl tracking-[0.25em] transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Copy room code ${roomCode}`}
                  >
                    {roomCode}
                  </button>
                  <span className="mt-2 text-xs text-muted-foreground">{copied ? "Copied" : "Click to copy"}</span>
                </div>
              ) : (
                <div className="mt-auto">
                  {chatItems.map((item) =>
                    item.kind === "separator" ? (
                      <div key={item.key} className="my-5 flex items-center gap-3 text-xs text-muted-foreground first:mt-0">
                        <span className="h-px flex-1 bg-border" />
                        {item.label}
                        <span className="h-px flex-1 bg-border" />
                      </div>
                    ) : (
                      <ChatMessage
                        key={item.key}
                        grouped={item.grouped}
                        message={{
                          id: String(item.msg.id),
                          sender: item.msg.sender_name || (item.msg.mine ? displayName : "Member"),
                          content: item.msg.content,
                          timestamp: new Date(item.msg.created_at * 1000),
                          isOwn: item.msg.mine ?? false,
                        }}
                        messageId={item.msg.pending ? undefined : item.msg.id}
                        pending={item.msg.pending}
                        onEdit={(id, content) =>
                          run(() => updateMessageMutation.mutateAsync({ id, content }), "Message updated")()
                        }
                        onDelete={(id) => run(() => deleteMessageMutation.mutateAsync(id), "Message deleted")()}
                        isUpdating={updateMessageMutation.isPending && updateMessageMutation.variables?.id === item.msg.id}
                        isDeleting={deleteMessageMutation.isPending && deleteMessageMutation.variables === item.msg.id}
                      />
                    )
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {showScrollButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => scrollToBottom("smooth")}
              className="absolute bottom-24 left-1/2 h-8 -translate-x-1/2 rounded-full bg-card shadow-md"
            >
              <ArrowDown />
              Latest
            </Button>
          )}

          {/* Composer */}
          <div className="shrink-0 px-3 pb-3 sm:px-6 sm:pb-5">
            {/* Fixed-height slot so the layout never jumps when someone starts typing */}
            <div className="mx-auto flex h-6 max-w-3xl items-center px-1" aria-live="polite">
              {typingLabel && (
                <TextShimmer
                  text={typingLabel}
                  duration={1.8}
                  className="text-xs"
                  baseColor="hsl(var(--muted-foreground))"
                  shimmerColor="hsl(var(--foreground))"
                />
              )}
            </div>
            <div
              className={cn(
                "mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-1.5 pl-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-foreground/25",
                closed && "pointer-events-none opacity-50"
              )}
            >
              <div className="relative min-w-0 flex-1 py-1.5">
                <div
                  ref={composerRef}
                  contentEditable={!closed}
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Message"
                  onInput={handleComposerInput}
                  onPaste={handleComposerPaste}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="message-body max-h-[40vh] min-h-[24px] overflow-y-auto outline-none"
                />
                {composerEmpty && (
                  <span className="pointer-events-none absolute inset-x-0 top-1.5 select-none truncate text-[15px] text-muted-foreground" aria-hidden>
                    {closed ? "This room has closed" : `Message ${roomName}`}
                  </span>
                )}
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={composerEmpty || sendMessageMutation.isPending || closed}
                size="icon"
                className="size-9 shrink-0 rounded-xl"
                aria-label="Send message"
              >
                <ArrowUp />
              </Button>
            </div>
            <div className="mx-auto mt-1.5 hidden max-w-3xl items-center justify-between px-1 text-xs text-muted-foreground sm:flex">
              <span>Enter to send, Shift + Enter for a new line</span>
              {room && !closed && (
                <span className="inline-flex items-center gap-1.5" title={live ? "Updates arrive instantly" : "Reconnecting; checking for updates every few seconds"}>
                  <span className={cn("size-1.5 rounded-full", live ? "bg-success" : "animate-pulse bg-warning")} />
                  {live ? "Live" : "Connecting…"}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Files + people: side column on desktop, tabs on mobile */}
        <aside
          className={cn(
            "min-h-0 w-full shrink-0 flex-col border-l-0 bg-card/50 lg:flex lg:w-[340px] lg:border-l xl:w-[380px]",
            panel === "chat" ? "hidden" : "flex"
          )}
        >
          <div className={cn("min-h-0 flex-1 flex-col", panel === "people" ? "hidden lg:flex" : "flex")}>
            <FilesPanel
              files={files}
              loading={filesLoading && !!activeCode}
              disabled={closed || !room}
              canDelete={isOwner}
              onUpload={handleUpload}
              onDownload={(id, filename) => downloadFile(id, filename)}
              onOpen={(id) => window.open(`/api/files/${id}/download`, "_blank", "noopener")}
              onDelete={(id) => run(() => deleteFileMutation.mutateAsync(id), "File deleted")()}
            />
          </div>

          <section
            aria-label="People"
            className={cn("shrink-0 px-4 py-4 lg:max-h-[45%] lg:overflow-y-auto lg:border-t", panel === "files" && "hidden lg:block")}
          >
            <h2 className="text-sm font-semibold max-lg:sr-only">
              People <span className="font-normal tabular-nums text-muted-foreground">{room?.member_count ?? ""}</span>
            </h2>
            <ul className="space-y-0.5 lg:mt-2">
              {room?.members.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 py-1.5 text-sm">
                  <span className="relative shrink-0">
                    <Avatar name={m.name} className="size-7 text-[10px]" />
                    {realtime.onlineIds.has(m.id) && (
                      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-success" title="Online" />
                    )}
                  </span>
                  <span className="min-w-0 truncate">
                    {m.name}
                    {m.me && <span className="text-muted-foreground"> (you)</span>}
                  </span>
                  {m.role === "owner" && <span className="ml-auto shrink-0 text-xs text-muted-foreground">Owner</span>}
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Invite people with this code</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-mono text-lg tracking-[0.2em]">{roomCode}</span>
                <Button variant="ghost" size="sm" className="h-8" onClick={handleCopyCode}>
                  {copied ? <Check className="text-success" /> : <Copy />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="mt-4 sm:hidden">
              <p className="px-0.5 text-xs text-muted-foreground">Your name in this room</p>
              <DisplayNameBadge block className="-mx-2 mt-1" />
            </div>
          </section>
        </aside>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {roomName}?</AlertDialogTitle>
            <AlertDialogDescription>
              All messages and files are removed and everyone loses access. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={deleteRoomMutation.isPending} onClick={handleDeleteRoom}>
              {deleteRoomMutation.isPending ? "Deleting…" : "Delete room"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

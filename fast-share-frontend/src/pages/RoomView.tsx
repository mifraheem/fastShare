import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  Send,
  Timer,
  MessageSquare,
  FolderOpen,
  Clock,
  Trash2,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DisplayNameBadge } from "@/components/DisplayNameBadge";
import { ChatMessage } from "@/components/ChatMessage";
import { FileList } from "@/components/FileList";
import { FileUpload } from "@/components/FileUpload";

import { useDisplayName } from "@/contexts/DisplayNameContext";
import { useRoomDetail, useDeleteRoom, useExtendRoom } from "@/hooks/useRooms";
import {
  useRoomMessages,
  useSendMessage,
  useUpdateMessage,
  useDeleteMessage,
} from "@/hooks/useMessages";
import {
  useRoomFiles,
  useUploadFile,
  useDeleteFile,
  useDownloadFile,
} from "@/hooks/useFiles";

import { toast } from "sonner";
import { sanitizeMessageHtml } from "@/lib/sanitize";

export default function RoomView() {
  const { roomName, roomCode } = useParams();
  const navigate = useNavigate();

  const [newMessage, setNewMessage] = useState("");
  const [composerEmpty, setComposerEmpty] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [extendingMinutes, setExtendingMinutes] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  /* =========================
     Room detail (for timer)
  ========================= */

  const { displayName } = useDisplayName();
  const { data: roomDetail } = useRoomDetail(roomCode ?? undefined);
  const deleteRoomMutation = useDeleteRoom();
  const extendRoomMutation = useExtendRoom();

  /* =========================
     Messages API
  ========================= */

  const { data: messagesData, isLoading: messagesLoading } =
    useRoomMessages(roomCode!, { limit: 100 });

  const sendMessageMutation = useSendMessage(roomCode!);
  const updateMessageMutation = useUpdateMessage(roomCode!);
  const deleteMessageMutation = useDeleteMessage(roomCode!);
  const messages = messagesData?.messages ?? [];

  /* =========================
     Files API
  ========================= */

  const {
    data: filesData,
    isLoading: filesLoading,
  } = useRoomFiles(roomCode!);

  const uploadFileMutation = useUploadFile(roomCode!);
  const deleteFileMutation = useDeleteFile(roomCode!);
  const downloadFile = useDownloadFile();

  const files = filesData?.files ?? [];

  /* =========================
     Countdown timer (actual remaining time from server)
  ========================= */

  useEffect(() => {
    if (roomDetail?.expires_at == null) return;
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, roomDetail.expires_at - now);
      setTimeLeft(remaining);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [roomDetail?.expires_at]);

  /* =========================
     Auto-scroll messages
  ========================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  /* =========================
     Helpers
  ========================= */

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode || "");
    setCopied(true);
    toast.success("Room code copied! 📋");
    setTimeout(() => setCopied(false), 2000);
  };

  /* =========================
     Send message
  ========================= */

  const getComposerContent = (): string => {
    const el = composerRef.current;
    if (!el) return "";
    const raw = el.innerHTML.trim();
    if (!raw || raw === "<br>" || raw === "<br/>") return "";
    return sanitizeMessageHtml(raw);
  };

  const handleComposerInput = () => {
    const el = composerRef.current;
    const text = el?.innerText?.trim() ?? "";
    setComposerEmpty(!text.length);
  };

  const handleComposerPaste = (e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (html) {
      e.preventDefault();
      const clean = sanitizeMessageHtml(html);
      document.execCommand("insertHTML", false, clean);
      handleComposerInput();
    }
    // else let default paste (plain text) happen
  };

  const handleSendMessage = async () => {
    const content = getComposerContent();
    if (!content) return;

    try {
      await sendMessageMutation.mutateAsync(content);
      if (composerRef.current) {
        composerRef.current.innerHTML = "";
        setComposerEmpty(true);
      }
      setNewMessage("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleEditMessage = async (id: number, content: string) => {
    try {
      await updateMessageMutation.mutateAsync({ id, content });
      toast.success("Message updated");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDeleteMessage = async (id: number) => {
    try {
      await deleteMessageMutation.mutateAsync(id);
      toast.success("Message deleted");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /* =========================
     File handlers
  ========================= */

  const handleFileUpload = async (file: File) => {
    try {
      await uploadFileMutation.mutateAsync(file);
      toast.success(`Uploaded "${file.name}"`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleFileDownload = async (id: number, filename: string) => {
    try {
      await downloadFile(id, filename);
    } catch {
      toast.error("Failed to download file");
    }
  };

  const handleFileDelete = async (id: number) => {
    try {
      await deleteFileMutation.mutateAsync(id);
      toast.success("File deleted");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  /* =========================
     Owner actions: extend & delete room
  ========================= */

  const handleExtendRoom = async (minutes: number) => {
    if (!roomCode) return;
    setExtendingMinutes(minutes);
    try {
      await extendRoomMutation.mutateAsync({ code: roomCode, minutes });
      toast.success(`Room extended by ${minutes} minutes ⏱️`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExtendingMinutes(null);
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomCode) return;
    try {
      await deleteRoomMutation.mutateAsync(roomCode);
      setDeleteDialogOpen(false);
      toast.success("Room deleted");
      navigate("/");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const EXTEND_OPTIONS = [
    { label: "15 min", minutes: 15 },
    { label: "30 min", minutes: 30 },
    { label: "1 hour", minutes: 60 },
  ] as const;

  /* =========================
     Render
  ========================= */

  return (
    <div className="h-screen flex flex-col bg-background gradient-bg overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 glass border-b border-border/50"
      >
        <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => navigate("/")}
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img
              src="/logo.png"
              alt="FastShare"
              className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg object-contain shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-display font-bold text-sm sm:text-base truncate" title={roomName?.replace(/-/g, " ")}>
                {roomName?.replace(/-/g, " ")}
              </h1>
              <div className="flex items-center gap-1.5">
                <code className="text-xs font-mono text-muted-foreground truncate max-w-[80px] sm:max-w-none">
                  {roomCode}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={handleCopyCode}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden sm:block">
              <DisplayNameBadge variant="compact" />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-secondary">
              <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="font-mono font-medium text-xs sm:text-sm tabular-nums">
                {timeLeft !== null ? formatTime(timeLeft) : "—:——:——"}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      {/* Main - fills remaining height */}
      <main className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex-1 flex flex-col min-h-0">
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 flex-1 min-h-0">
          {/* Chat + Files - full height */}
          <div className="lg:col-span-2 flex flex-col min-h-0 min-w-0">
            <Tabs defaultValue="chat" className="flex flex-col flex-1 min-h-0">
              <TabsList className="glass-card p-1 mb-2 shrink-0 grid grid-cols-2 w-full sm:w-auto">
                <TabsTrigger value="chat" className="min-h-[44px] text-sm sm:text-base">
                  <MessageSquare className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="files" className="min-h-[44px] text-sm sm:text-base">
                  <FolderOpen className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
                  Files
                </TabsTrigger>
              </TabsList>

              {/* Chat - full height */}
              <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
                <div className="glass-card flex-1 flex flex-col min-h-0 rounded-lg overflow-hidden">
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                    {messagesLoading && (
                      <p className="text-sm text-muted-foreground">
                        Loading messages…
                      </p>
                    )}

                    {messages.map((msg, index) => (
                      <ChatMessage
                        key={msg.id}
                        index={index}
                        message={{
                          id: String(msg.id),
                          sender:
                            msg.sender_name ||
                            (msg.mine ? displayName : "Member"),
                          content: msg.content,
                          timestamp: new Date(msg.created_at * 1000),
                          isOwn: msg.mine ?? false,
                          avatar: msg.mine ? "ME" : "U",
                        }}
                        messageId={msg.id}
                        onEdit={handleEditMessage}
                        onDelete={handleDeleteMessage}
                        isUpdating={
                          updateMessageMutation.isPending &&
                          updateMessageMutation.variables?.id === msg.id
                        }
                        isDeleting={
                          deleteMessageMutation.isPending &&
                          deleteMessageMutation.variables === msg.id
                        }
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 sm:p-4 border-t border-border/50 shrink-0">
                    <div className="flex gap-2 items-end">
                      <div className="relative flex-1 min-h-[44px] rounded-lg border border-border bg-secondary/50 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background">
                        <div
                          ref={composerRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={handleComposerInput}
                          onPaste={handleComposerPaste}
                          onKeyDown={handleKeyDown}
                          className="min-h-[42px] max-h-[200px] overflow-y-auto px-3 py-2.5 text-sm outline-none prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm"
                          data-placeholder="Type a message…"
                        />
                        {composerEmpty && (
                          <span
                            className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground select-none"
                            aria-hidden
                          >
                            Type a message…
                          </span>
                        )}
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={composerEmpty}
                        size="icon"
                        className="shrink-0 h-[44px] w-[44px]"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Paste from any site to keep formatting
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Files */}
              <TabsContent value="files" className="mt-0">
                <div className="glass-card p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-lg">
                  <FileUpload onUpload={handleFileUpload} />

                  {filesLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Loading files…
                    </p>
                  ) : (
                    <FileList
                      files={files}
                      onDownload={handleFileDownload}
                      onDelete={handleFileDelete}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Room Info & Owner options */}
          <div className="space-y-4 sm:space-y-6 min-h-0 overflow-y-auto lg:max-h-[calc(100vh-8rem)]">
            <div className="glass-card p-4 sm:p-6 rounded-lg">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary shrink-0" />
                Room Info
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                You're here as
              </p>
              <DisplayNameBadge variant="compact" className="w-full justify-center mb-3 sm:mb-4" />
              <code className="block p-2.5 sm:p-3 rounded-lg bg-secondary text-center text-xs sm:text-sm font-mono mb-3 sm:mb-4 break-all">
                {roomCode}
              </code>
              {roomDetail?.members && roomDetail.members.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold mb-2">
                    Members ({roomDetail.member_count})
                  </h4>
                  <ul className="space-y-1.5">
                    {roomDetail.members.map((m) => (
                      <li
                        key={m.id}
                        className="text-sm flex items-center justify-between gap-2"
                      >
                        <span className="truncate min-w-0">
                          {m.name || "Member"}
                          {m.me && (
                            <span className="ml-1 text-muted-foreground text-xs">
                              (you)
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {m.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Owner-only: Extend & Delete */}
            {roomDetail?.owner && (
              <div className="glass-card p-4 sm:p-6 space-y-4 rounded-lg">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Owner options
                </h3>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add time to this room
                  </p>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    {EXTEND_OPTIONS.map(({ label, minutes }) => (
                      <Button
                        key={minutes}
                        variant="outline"
                        size="sm"
                        className="min-h-[44px] flex-1 sm:flex-initial"
                        disabled={extendRoomMutation.isPending || roomDetail?.expired}
                        onClick={() => handleExtendRoom(minutes)}
                      >
                        {extendingMinutes === minutes ? "Adding…" : `+ ${label}`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    Permanently remove this room
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive min-h-[44px]"
                    disabled={deleteRoomMutation.isPending}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2 shrink-0" />
                    Delete room
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete room confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this room?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the room. All messages and files will
              be removed, and everyone will lose access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteRoomMutation.isPending}
              onClick={handleDeleteRoom}
            >
              {deleteRoomMutation.isPending ? "Deleting…" : "Delete room"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

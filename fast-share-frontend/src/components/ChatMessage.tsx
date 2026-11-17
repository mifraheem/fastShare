"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/Avatar";
import { sanitizeMessageHtml, isHtml, htmlToPlainText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

interface ChatMessageProps {
  message: Message;
  /** Numeric API id – when set with onEdit/onDelete, shows edit/delete for own messages */
  messageId?: number;
  /** Grouped under the previous message from the same sender: hide avatar + name */
  grouped?: boolean;
  onEdit?: (id: number, content: string) => void;
  onDelete?: (id: number) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
  /** Shown optimistically, not yet confirmed by the server */
  pending?: boolean;
}

export function ChatMessage({
  message,
  messageId,
  grouped = false,
  onEdit,
  onDelete,
  isUpdating,
  isDeleting,
  pending,
}: ChatMessageProps) {
  const isOwn = message.isOwn;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editEditableRef = useRef<HTMLDivElement>(null);

  const canMutate = isOwn && messageId != null && (onEdit || onDelete);
  const contentIsHtml = isHtml(message.content);
  const time = format(message.timestamp, "h:mm a");

  useEffect(() => {
    if (!isEditing) return;
    if (contentIsHtml && editEditableRef.current) {
      editEditableRef.current.innerHTML = sanitizeMessageHtml(message.content);
      editEditableRef.current.focus();
    } else {
      editInputRef.current?.focus();
    }
  }, [isEditing, message.content, contentIsHtml]);

  const getEditValue = (): string => {
    if (contentIsHtml) {
      const raw = (editEditableRef.current?.innerHTML ?? editContent).trim();
      return raw ? sanitizeMessageHtml(raw) : "";
    }
    return editContent.trim();
  };

  const handleSaveEdit = () => {
    const value = getEditValue();
    if (value && value !== message.content && onEdit && messageId != null) onEdit(messageId, value);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const editKeys = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") handleCancelEdit();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(contentIsHtml ? htmlToPlainText(message.content) : message.content);
    setCopied(true);
    toast.success("Message copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("flex gap-2.5", grouped ? "mt-1" : "mt-4 first:mt-0", isOwn && "flex-row-reverse")}>
      {!isOwn && (grouped ? <span className="w-8 shrink-0" aria-hidden /> : <Avatar name={message.sender} />)}

      <div className={cn("flex min-w-0 max-w-[82%] flex-col sm:max-w-[70%]", isOwn && "items-end")}>
        {!grouped && (
          <div className={cn("mb-1 flex items-baseline gap-2 px-0.5", isOwn && "flex-row-reverse")}>
            {!isOwn && <span className="truncate text-[13px] font-semibold">{message.sender}</span>}
            <time className="text-xs text-muted-foreground" dateTime={message.timestamp.toISOString()}>
              {pending ? "Sending…" : time}
            </time>
          </div>
        )}

        {isEditing ? (
          <div className="w-full min-w-[min(260px,70vw)] rounded-2xl border bg-card p-2">
            {contentIsHtml ? (
              <div
                ref={editEditableRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => setEditContent(editEditableRef.current?.innerHTML ?? "")}
                onKeyDown={editKeys}
                className="message-body min-h-[72px] rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <Input
                ref={editInputRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={editKeys}
                aria-label="Edit message"
              />
            )}
            <div className="mt-2 flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={isUpdating}>
                {isUpdating ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn("group relative max-w-full transition-opacity", (isDeleting || pending) && "opacity-60")}>
            <div className={cn("px-3.5 py-2", isOwn ? "bubble-own" : "bubble-other", grouped && (isOwn ? "rounded-tr-md" : "rounded-tl-md"))}>
              {contentIsHtml ? (
                <div
                  className="message-body"
                  dangerouslySetInnerHTML={{ __html: sanitizeMessageHtml(message.content) }}
                />
              ) : (
                <p className="message-body whitespace-pre-wrap">{message.content}</p>
              )}
            </div>

            {/* Actions: on hover with a mouse, always visible on touch screens */}
            <div
              className={cn(
                "absolute top-1/2 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100",
                isOwn ? "right-full pr-1" : "left-full pl-1"
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={handleCopy}
                aria-label="Copy message"
                title="Copy message"
              >
                {copied ? <Check className="text-success" /> : <Copy />}
              </Button>
              {canMutate && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label="More actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwn ? "end" : "start"}>
                    {onEdit && (
                      <DropdownMenuItem
                        onClick={() => {
                          setEditContent(message.content);
                          setIsEditing(true);
                        }}
                        disabled={isUpdating}
                      >
                        <Pencil className="mr-2 size-4" />
                        Edit message
                      </DropdownMenuItem>
                    )}
                    {onEdit && onDelete && <DropdownMenuSeparator />}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(messageId!)}
                        disabled={isDeleting}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete message
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

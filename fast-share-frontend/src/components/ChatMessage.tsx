import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Message } from "@/data/mockData";
import { format } from "date-fns";
import { MoreVertical, Pencil, Trash2, Check, X, Copy, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sanitizeMessageHtml, isHtml, htmlToPlainText } from "@/lib/sanitize";
import { toast } from "sonner";

interface ChatMessageProps {
  message: Message;
  index: number;
  /** Numeric API id – when set with onEdit/onDelete, shows edit/delete for own messages */
  messageId?: number;
  onEdit?: (id: number, content: string) => void;
  onDelete?: (id: number) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function ChatMessage({
  message,
  index,
  messageId,
  onEdit,
  onDelete,
  isUpdating,
  isDeleting,
}: ChatMessageProps) {
  const isOwn = message.isOwn;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editEditableRef = useRef<HTMLDivElement>(null);

  const canMutate = isOwn && messageId != null && (onEdit || onDelete);
  const contentIsHtml = isHtml(message.content);
  const displayContent = contentIsHtml
    ? sanitizeMessageHtml(message.content)
    : message.content;

  useEffect(() => {
    if (isEditing) {
      setEditContent(message.content);
      if (contentIsHtml && editEditableRef.current) {
        editEditableRef.current.innerHTML = sanitizeMessageHtml(message.content);
        editEditableRef.current.focus();
      } else {
        editInputRef.current?.focus();
      }
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
    if (value && value !== message.content && onEdit && messageId != null) {
      onEdit(messageId, value);
      setIsEditing(false);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleCopyMessage = async () => {
    const plain = contentIsHtml ? htmlToPlainText(message.content) : message.content;
    await navigator.clipboard.writeText(plain);
    setCopied(true);
    toast.success("Message copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
      className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
          isOwn
            ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        {message.avatar}
      </motion.div>

      <div className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? "items-end" : ""}`}>
        <div className={`flex items-center gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
          <span className="text-sm font-medium text-foreground">
            {message.sender}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(message.timestamp, "h:mm a")}
          </span>
          {canMutate && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-70 hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Message actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"}>
                {onEdit && (
                  <DropdownMenuItem
                    onClick={() => setIsEditing(true)}
                    disabled={isUpdating}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(messageId!)}
                    disabled={isDeleting}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isEditing ? (
          <div
            className={`px-3 py-2 rounded-2xl min-w-[200px] ${
              isOwn ? "chat-bubble-own" : "chat-bubble-other"
            }`}
          >
            {contentIsHtml ? (
              <div
                ref={editEditableRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() =>
                  setEditContent(editEditableRef.current?.innerHTML ?? "")
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="min-h-[80px] rounded border border-border bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-2 prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_h1]:text-lg [&_h2]:text-base"
              />
            ) : (
              <Input
                ref={editInputRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="bg-background/50 border-border mb-2"
                placeholder="Edit message..."
              />
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-8"
              >
                <X className="h-3.5 w-3 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={!getEditValue() || getEditValue() === message.content || isUpdating}
                className="h-8"
              >
                <Check className="h-3.5 w-3 mr-1" />
                {isUpdating ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <motion.div
            whileHover={{ scale: 1.01 }}
            className={`group relative px-4 py-3 ${isOwn ? "chat-bubble-own" : "chat-bubble-other"} ${isDeleting ? "opacity-50" : ""}`}
          >
            {contentIsHtml ? (
              <div
                className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm"
                dangerouslySetInnerHTML={{ __html: displayContent }}
              />
            ) : (
              <p className="text-sm leading-relaxed">{message.content}</p>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-background/80 hover:bg-background"
              onClick={handleCopyMessage}
              title="Copy message"
            >
              {copied ? (
                <CheckCheck className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

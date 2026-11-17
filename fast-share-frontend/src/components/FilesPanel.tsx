"use client";

import { useRef, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  File as FileIcon,
  Download,
  ExternalLink,
  Trash2,
  Upload,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileItem } from "@/api/files.api";
import { formatBytes, splitFilename } from "@/lib/format";
import { TextShimmer } from "@/components/wensity/text-shimmer";
import { cn } from "@/lib/utils";

const MAX_BYTES = 50 * 1024 * 1024;
const PREVIEWABLE = ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "pdf", "txt", "mp4", "webm", "mp3"];

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "heic"].includes(ext)) return FileImage;
  if (["mp4", "webm", "mov", "mkv"].includes(ext)) return FileVideo;
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return FileAudio;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive;
  if (["pdf", "doc", "docx", "txt", "md", "xls", "xlsx", "csv", "ppt", "pptx"].includes(ext)) return FileText;
  return FileIcon;
}

/** Truncates the middle of long names but always shows the extension. */
export function FileName({ name, className }: { name: string; className?: string }) {
  const { base, ext } = splitFilename(name);
  return (
    <span className={cn("flex min-w-0", className)} title={name}>
      <span className="truncate">{base}</span>
      <span className="shrink-0">{ext}</span>
    </span>
  );
}

interface FilesPanelProps {
  files: FileItem[];
  loading: boolean;
  disabled?: boolean;
  /** Owners can delete any file */
  canDelete: boolean;
  onUpload: (file: File) => Promise<void>;
  onDownload: (id: number, filename: string) => void;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
}

export function FilesPanel({ files, loading, disabled, canDelete, onUpload, onDownload, onOpen, onDelete }: FilesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file || uploading) return;
    if (file.size > MAX_BYTES) {
      toast.error(`"${file.name}" is ${formatBytes(file.size)}. Files can be up to 50 MB.`);
      return;
    }
    setUploading(file.name);
    try {
      await onUpload(file);
    } finally {
      setUploading(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section
      aria-label="Files"
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) upload(e.dataTransfer.files?.[0]);
      }}
      className={cn("relative flex min-h-0 flex-col", dragging && "after:pointer-events-none after:absolute after:inset-2 after:rounded-xl after:border-2 after:border-dashed after:border-primary after:bg-primary/5")}
    >
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <h2 className="text-sm font-semibold max-lg:sr-only">
          Files <span className="font-normal tabular-nums text-muted-foreground">{files.length || ""}</span>
        </h2>
        <input ref={inputRef} type="file" className="sr-only" tabIndex={-1} onChange={(e) => upload(e.target.files?.[0])} />
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-8"
          disabled={disabled || !!uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
          Upload
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {uploading && (
          <div className="flex items-center gap-3 rounded-lg px-2 py-2.5" aria-live="polite">
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <FileName name={uploading} className="text-sm" />
              <TextShimmer
                as="p"
                text="Uploading…"
                duration={1.6}
                className="text-xs"
                baseColor="hsl(var(--muted-foreground))"
                shimmerColor="hsl(var(--foreground))"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2 px-2">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
        ) : files.length === 0 && !uploading ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="mx-2 flex w-[calc(100%-1rem)] flex-col items-center rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:pointer-events-none"
          >
            <span className="font-medium text-foreground">Drop a file here or browse</span>
            <span className="mt-1 text-xs">Up to 50 MB. Files are deleted when the room closes.</span>
          </button>
        ) : (
          <ul className="space-y-0.5">
            {files.map((file) => {
              const Icon = iconFor(file.filename);
              const ext = file.filename.split(".").pop()?.toLowerCase() ?? "";
              return (
                <li key={file.id} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <FileName name={file.filename} className="text-sm font-medium" />
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                      <span className="mx-1.5">/</span>
                      {formatDistanceToNowStrict(new Date(file.created_at * 1000), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                    {PREVIEWABLE.includes(ext) && (
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => onOpen(file.id)} aria-label={`Open ${file.filename}`} title="Open">
                        <ExternalLink />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => onDownload(file.id, file.filename)} aria-label={`Download ${file.filename}`} title="Download">
                      <Download />
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => onDelete(file.id)} aria-label={`Delete ${file.filename}`} title="Delete">
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

import { motion } from "framer-motion";
import {
  FileText,
  Image,
  Video,
  Music,
  File as FileIcon,
  Download,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { FileItem } from "@/api/files.api";

interface FileListProps {
  files: FileItem[];
  onDownload?: (id: number, filename: string) => void;
  onDelete?: (id: number) => void;
}

/* =========================
   Helpers
========================= */

function getFileType(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (!ext) return "other";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg"].includes(ext)) return "audio";
  if (["pdf", "doc", "docx", "txt"].includes(ext)) return "document";

  return "other";
}

const fileTypeIcons = {
  document: FileText,
  image: Image,
  video: Video,
  audio: Music,
  other: FileIcon,
};

const fileTypeColors = {
  document: "text-primary",
  image: "text-success",
  video: "text-accent",
  audio: "text-warning",
  other: "text-muted-foreground",
};

/* =========================
   Component
========================= */

export function FileList({
  files,
  onDownload,
  onDelete,
}: FileListProps) {
  if (!files.length) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        No files uploaded yet
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((file, index) => {
        const type = getFileType(file.filename);
        const IconComponent = fileTypeIcons[type];
        const colorClass = fileTypeColors[type];

        return (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group"
          >
            <div className={`p-3 rounded-xl bg-background ${colorClass}`}>
              <IconComponent className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">
                {file.filename}
              </h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{(file.size / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(
                    new Date(file.created_at * 1000),
                    { addSuffix: true }
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {onDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    onDownload(file.id, file.filename)
                  }
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onDelete(file.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

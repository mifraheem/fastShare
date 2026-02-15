import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  FileText,
  Image,
  Video,
  Music,
  File as FileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onUpload: (file: File) => void;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file instanceof File) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file instanceof File) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    onUpload(selectedFile); // ✅ sends REAL File
    setSelectedFile(null);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image")) return Image;
    if (type.startsWith("video")) return Video;
    if (type.startsWith("audio")) return Music;
    if (type.includes("pdf") || type.includes("document")) return FileText;
    return FileIcon;
  };

  return (
    <div className="space-y-4">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          borderColor: isDragging
            ? "hsl(var(--primary))"
            : "hsl(var(--border))",
          backgroundColor: isDragging
            ? "hsl(var(--primary) / 0.05)"
            : "transparent",
        }}
        className="relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
      >
        <input
          type="file"
          name="file" // ✅ CRITICAL
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <motion.div
          animate={{ scale: isDragging ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">
            Drop your files here or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supports images, documents, videos, and more 📎
          </p>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-secondary"
          >
            {(() => {
              const Icon = getFileIcon(selectedFile.type);
              return (
                <div className="p-3 rounded-xl bg-background text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              );
            })()}

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFile(null)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>

            <Button
              onClick={handleUpload}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              Upload
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateRoomName } from "@/lib/format";

const ROOM_NAME_MAX_LENGTH = 40;

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (name: string) => void;
  loading?: boolean;
}

export function CreateRoomModal({ isOpen, onClose, onCreateRoom, loading }: CreateRoomModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a room</DialogTitle>
          <DialogDescription>
            It closes after 50 minutes. You can add time from inside the room.
          </DialogDescription>
        </DialogHeader>
        {/* Content unmounts when closed, so each open starts with a fresh suggestion */}
        <CreateRoomForm onCancel={onClose} onCreateRoom={onCreateRoom} loading={loading} />
      </DialogContent>
    </Dialog>
  );
}

function CreateRoomForm({
  onCancel,
  onCreateRoom,
  loading,
}: {
  onCancel: () => void;
  onCreateRoom: (name: string) => void;
  loading?: boolean;
}) {
  const [roomName, setRoomName] = useState(generateRoomName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) onCreateRoom(roomName.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="room-name" className="text-sm font-medium">
          Room name
        </label>
        <div className="flex gap-2">
          <Input
            id="room-name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value.slice(0, ROOM_NAME_MAX_LENGTH))}
            maxLength={ROOM_NAME_MAX_LENGTH}
            autoComplete="off"
            autoFocus
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setRoomName(generateRoomName())}
            aria-label="Suggest another name"
            title="Suggest another name"
          >
            <Shuffle />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Everyone in the room sees this name.</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!roomName.trim() || loading}>
          {loading ? "Creating…" : "Create room"}
        </Button>
      </div>
    </form>
  );
}

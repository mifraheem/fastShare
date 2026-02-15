import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Key,
  MessageSquare,
  Upload,
  Zap,
  Shield,
  Users,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { DisplayNameBadge } from "@/components/DisplayNameBadge";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { JoinRoomModal } from "@/components/JoinRoomModal";
import { RoomCard } from "@/components/RoomCard";

import {
  useCreateRoom,
  useJoinRoom,
  useJoinedRooms,
} from "@/hooks/useRooms";

import { ensureClientUUID } from "@/lib/clientUUID";

export default function Index() {
  const navigate = useNavigate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  /* =========================
     Ensure Client UUID
  ========================= */
  useEffect(() => {
    ensureClientUUID();
  }, []);

  /* =========================
     API Hooks
  ========================= */
  const {
    data: joinedRoomsData,
    isLoading: roomsLoading,
    isError: roomsError,
  } = useJoinedRooms(false);

  const createRoomMutation = useCreateRoom();
  const joinRoomMutation = useJoinRoom();

  /* =========================
     Handlers
  ========================= */

  const handleCreateRoom = async (customName: string) => {
    try {
      const room = await createRoomMutation.mutateAsync(customName.trim() || undefined);
      setIsCreateModalOpen(false);

      navigate(
        `/room/${room.name.replace(/\s+/g, "-")}/${room.code}`
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleJoinRoom = async (code: string) => {
    try {
      const room = await joinRoomMutation.mutateAsync(code);
      setIsJoinModalOpen(false);

      navigate(
        `/room/${room.name.replace(/\s+/g, "-")}/${room.code}`
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleRoomClick = (room: {
    name: string;
    code: string;
  }) => {
    navigate(
      `/room/${room.name.replace(/\s+/g, "-")}/${room.code}`
    );
  };

  /* =========================
     UI Data
  ========================= */

  const rooms = joinedRoomsData?.rooms ?? [];

  const features = [
    {
      icon: Zap,
      title: "Real-time Chat",
      description: "Instant messaging with your team",
    },
    {
      icon: Upload,
      title: "File Sharing",
      description: "Share files securely and easily",
    },
    {
      icon: Shield,
      title: "Private Rooms",
      description: "Secure, invite-only spaces",
    },
  ];

  /* =========================
     Render
  ========================= */

  return (
    <div className="min-h-screen bg-background gradient-bg overflow-hidden">
      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">
              RoomChat
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DisplayNameBadge />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6">
            <span className="gradient-text">Connect.</span>{" "}
            <span>Share.</span>{" "}
            <span className="gradient-text">Collaborate.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Private rooms for real-time chat and file sharing ⚡
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-20">
          {/* Create */}
          <div
            onClick={() => setIsCreateModalOpen(true)}
            className="glass-card p-8 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6">
              <Plus className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Create Room
            </h2>
            <p className="text-muted-foreground">
              Start a new private room
            </p>
          </div>

          {/* Join */}
          <div
            onClick={() => setIsJoinModalOpen(true)}
            className="glass-card p-8 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-6">
              <Key className="h-8 w-8 text-accent-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Join Room
            </h2>
            <p className="text-muted-foreground">
              Enter an existing room code
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-20">
          {features.map((f) => (
            <div key={f.title} className="text-center p-6">
              <div className="w-12 h-12 rounded-xl bg-secondary mx-auto mb-4 flex items-center justify-center">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Joined Rooms */}
        <section className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Your Rooms
            </h2>
            <span className="text-sm text-muted-foreground">
              {rooms.length} rooms
            </span>
          </div>

          {roomsLoading && (
            <p className="text-muted-foreground">
              Loading rooms…
            </p>
          )}

          {roomsError && (
            <p className="text-red-500">
              Failed to load rooms
            </p>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room, index) => (
              <RoomCard
                key={room.code}
                room={room}
                index={index}
                onClick={() => handleRoomClick(room)}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateRoom={handleCreateRoom}
        loading={createRoomMutation.isPending}
      />

      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinRoom={handleJoinRoom}
        loading={joinRoomMutation.isPending}
      />
    </div>
  );
}

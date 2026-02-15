import { motion } from "framer-motion";
import { Users, Clock, Crown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { JoinedRoom } from "@/api/rooms.api";

interface RoomCardProps {
  room: JoinedRoom;
  onClick: () => void;
  index: number;
}

function toDate(seconds: number) {
  return new Date(seconds * 1000);
}

export function RoomCard({ room, onClick, index }: RoomCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass-card p-5 cursor-pointer group relative overflow-hidden"
    >
      {/* Hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {room.name}
            </h3>
            <p className="text-xs font-mono text-muted-foreground">
              {room.code}
            </p>
          </div>

          {room.owner && (
            <Crown className="h-4 w-4 text-yellow-500" />
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{room.role}</span>
          </div>

          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              expires{" "}
              {formatDistanceToNow(toDate(room.expires_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>

        {room.expired && (
          <p className="mt-2 text-xs text-red-500">
            Room expired
          </p>
        )}
      </div>

      {/* Bottom hover line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
    </motion.div>
  );
}

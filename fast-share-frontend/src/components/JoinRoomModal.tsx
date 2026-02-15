import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (code: string) => void;
  loading?: boolean;
}

export function JoinRoomModal({ isOpen, onClose, onJoinRoom, loading }: JoinRoomModalProps) {
  const [roomCode, setRoomCode] = useState("");

  const handleJoin = () => {
    if (roomCode.trim()) {
      onJoinRoom(roomCode.toUpperCase());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && roomCode.trim()) {
      handleJoin();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md glass-card p-8 relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="relative z-10">
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary mb-4">
                  <Key className="h-8 w-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-display font-bold gradient-text">Join a Room</h2>
                <p className="text-muted-foreground mt-2">Enter the room code to join 🔑</p>
              </motion.div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Room Code</label>
                  <Input
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    className="h-12 bg-secondary/50 border-border/50 focus:border-primary text-center font-mono text-lg tracking-widest uppercase"
                    placeholder="XXXX-XXXX"
                    maxLength={9}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Ask the room owner for the code
                  </p>
                </div>

                <Button
                  onClick={handleJoin}
                  disabled={!roomCode.trim() || loading}
                  className="w-full h-12 bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity font-semibold text-primary-foreground group"
                >
                  {loading ? "Joining…" : "Join Room"}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

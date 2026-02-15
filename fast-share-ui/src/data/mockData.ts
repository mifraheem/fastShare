export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
  avatar: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: "image" | "document" | "video" | "audio" | "other";
  uploadedBy: string;
  uploadedAt: Date;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
  lastActivity: Date;
  memberCount: number;
  unreadMessages: number;
  emoji: string;
}

export const mockMessages: Message[] = [
  {
    id: "1",
    sender: "Alex Chen",
    content: "Hey everyone! 👋 Just uploaded the design files",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    isOwn: false,
    avatar: "AC",
  },
  {
    id: "2",
    sender: "You",
    content: "Awesome! Looking forward to checking them out 🎨",
    timestamp: new Date(Date.now() - 1000 * 60 * 40),
    isOwn: true,
    avatar: "ME",
  },
  {
    id: "3",
    sender: "Sarah Kim",
    content: "The new color palette looks amazing! Great work team ✨",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    isOwn: false,
    avatar: "SK",
  },
  {
    id: "4",
    sender: "You",
    content: "Thanks! I spent a lot of time on the gradients 💜",
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
    isOwn: true,
    avatar: "ME",
  },
  {
    id: "5",
    sender: "Mike Johnson",
    content: "Can we schedule a call to discuss the implementation details?",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    isOwn: false,
    avatar: "MJ",
  },
  {
    id: "6",
    sender: "Alex Chen",
    content: "Sure! How about tomorrow at 2pm? 📅",
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
    isOwn: false,
    avatar: "AC",
  },
];

export const mockFiles: UploadedFile[] = [
  {
    id: "f1",
    name: "design-system-v2.fig",
    size: "24.5 MB",
    type: "document",
    uploadedBy: "Alex Chen",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: "f2",
    name: "hero-banner.png",
    size: "3.2 MB",
    type: "image",
    uploadedBy: "Sarah Kim",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: "f3",
    name: "presentation.pdf",
    size: "8.7 MB",
    type: "document",
    uploadedBy: "You",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "f4",
    name: "demo-video.mp4",
    size: "156 MB",
    type: "video",
    uploadedBy: "Mike Johnson",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 15),
  },
];

export const mockRooms: Room[] = [
  {
    id: "room1",
    name: "Design Sprint",
    code: "DSGN-2024",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    lastActivity: new Date(Date.now() - 1000 * 60 * 5),
    memberCount: 5,
    unreadMessages: 3,
    emoji: "🎨",
  },
  {
    id: "room2",
    name: "Product Launch",
    code: "PROD-LAUNCH",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    lastActivity: new Date(Date.now() - 1000 * 60 * 30),
    memberCount: 12,
    unreadMessages: 0,
    emoji: "🚀",
  },
  {
    id: "room3",
    name: "Weekend Hangout",
    code: "WKND-FUN",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2),
    memberCount: 8,
    unreadMessages: 15,
    emoji: "🎉",
  },
];

export const roomNameAdjectives = [
  "Creative", "Swift", "Bright", "Cosmic", "Digital",
  "Electric", "Golden", "Infinite", "Lunar", "Neon",
  "Quantum", "Radiant", "Stellar", "Thunder", "Vivid",
];

export const roomNameNouns = [
  "Studio", "Hub", "Space", "Zone", "Lab",
  "Lounge", "Nexus", "Portal", "Realm", "Sphere",
  "Summit", "Vault", "Wave", "Workshop", "Arena",
];

export const generateRoomName = (): string => {
  const adj = roomNameAdjectives[Math.floor(Math.random() * roomNameAdjectives.length)];
  const noun = roomNameNouns[Math.floor(Math.random() * roomNameNouns.length)];
  return `${adj} ${noun}`;
};

export const generateRoomCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

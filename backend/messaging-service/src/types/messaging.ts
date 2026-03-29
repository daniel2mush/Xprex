export interface ChatParticipant {
  id: string;
  username: string;
  handle?: string;
  avatar?: string;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  media: {
    id: string;
    url: string;
    type: "IMAGE" | "VIDEO" | "GIF";
  }[];
}

export interface ChatConversation {
  id: string;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  updatedAt: string;
  currentUserLastReadAt?: string;
  otherParticipantLastReadAt?: string;
}

export interface ConversationPreview {
  id: string;
  participant: ChatParticipant;
  lastMessage?: ChatMessage;
  updatedAt: string;
  unreadCount: number;
}

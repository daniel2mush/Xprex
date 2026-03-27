export interface ChatParticipant {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  updatedAt: string;
}

export interface ConversationPreview {
  id: string;
  participant: ChatParticipant;
  lastMessage?: ChatMessage;
  updatedAt: string;
  unreadCount: number;
}

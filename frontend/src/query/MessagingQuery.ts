import {
  ConversationResponse,
  ConversationsResponse,
} from "@/types/Types";
import { useQuery } from "@tanstack/react-query";

export const useGetConversations = () => {
  return useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: async () => {
      const response = await fetch("/api/messages/conversations", {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch conversations");
      }

      return response.json() as Promise<ConversationsResponse>;
    },
    staleTime: 1000 * 30,
    refetchInterval: 15_000,
  });
};

export const useGetConversation = (conversationId?: string) => {
  return useQuery({
    queryKey: ["messages", "conversation", conversationId],
    enabled: Boolean(conversationId),
    queryFn: async () => {
      const response = await fetch(`/api/messages/conversations/${conversationId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch conversation");
      }

      return response.json() as Promise<ConversationResponse>;
    },
    staleTime: 1000 * 10,
  });
};

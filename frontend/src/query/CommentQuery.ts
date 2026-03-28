import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { CommentResponse, CommentTypes } from "@/types/Types";

export const useGetComments = (postId: string) => {
  return useInfiniteQuery({
    queryKey: ["comments", postId],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(
        `/api/comments/posts/${postId}?page=${pageParam}&limit=20`,
      );
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json() as Promise<CommentResponse>;
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
};

export const useCreateComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { content: string; parentId?: string }) => {
      const response = await fetch(`/api/comments/posts/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to post comment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["get-all-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
};

export const useDeleteComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to delete comment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["get-all-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
};

export const useGetReplies = (commentId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["replies", commentId],
    queryFn: async () => {
      const response = await fetch(`/api/comments/replies/${commentId}`);
      if (!response.ok) throw new Error("Failed to fetch replies");
      return response.json();
    },
    enabled,
  });
};

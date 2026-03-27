import {
  PostResponse,
  CreatePostTypes,
  ToggleLikeResponse,
} from "@/types/Types";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

export const useGetAllPost = () => {
  return useQuery({
    queryKey: ["get-all-posts"],
    queryFn: async () => {
      const response = await fetch("/api/posts", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json() as Promise<PostResponse>;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePostTypes) => {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to create post");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get-all-posts"] });
    },
  });
};

export const useTogglePostLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "PATCH",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to toggle like");
      }

      return response.json() as Promise<ToggleLikeResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get-all-posts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useUploadMedia = () => {
  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("media", file));

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
        // No Content-Type header — browser sets multipart boundary automatically
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Upload failed");
      }

      const res = await response.json();
      return res.data.urls as string[];
    },
  });
};

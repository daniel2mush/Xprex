import {
  PostResponse,
  CreatePostTypes,
  ToggleBookmarkResponse,
  ToggleLikeResponse,
  ToggleRepostResponse,
} from "@/types/Types";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

const FEED_LIMIT = 10;

const fetchPostsPage = async (pageParam: number, endpoint = "/api/posts") => {
  const response = await fetch(`${endpoint}?page=${pageParam}&limit=${FEED_LIMIT}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch posts");
  }

  return response.json() as Promise<PostResponse>;
};

export const useGetAllPost = () => {
  return useQuery({
    queryKey: ["get-all-posts"],
    queryFn: async () => {
      const response = await fetch("/api/posts?page=1&limit=12", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json() as Promise<PostResponse>;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useInfinitePosts = () => {
  return useInfiniteQuery({
    queryKey: ["posts", "feed"],
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => fetchPostsPage(pageParam),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 1000 * 30,
  });
};

export const useInfiniteBookmarkedPosts = () => {
  return useInfiniteQuery({
    queryKey: ["posts", "bookmarks"],
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) =>
      fetchPostsPage(pageParam, "/api/posts/bookmarks"),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 1000 * 30,
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
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
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
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useTogglePostBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}/bookmark`, {
        method: "PATCH",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to toggle bookmark");
      }

      return response.json() as Promise<ToggleBookmarkResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get-all-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useTogglePostRepost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}/repost`, {
        method: "PATCH",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to toggle repost");
      }

      return response.json() as Promise<ToggleRepostResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get-all-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
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

import {
  SearchHistoryResponse,
  SearchResponse,
  SearchUsersResponse,
  TrendingDiscoveryResponse,
} from "@/types/Types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useSearchPosts = (search: string) => {
  const trimmedSearch = search.trim();

  return useQuery({
    queryKey: ["search", "posts", trimmedSearch],
    enabled: trimmedSearch.length > 0,
    queryFn: async () => {
      const response = await fetch(
        `/api/search/posts?search=${encodeURIComponent(trimmedSearch)}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to search posts");
      }

      return response.json() as Promise<SearchResponse>;
    },
    staleTime: 1000 * 30,
  });
};

export const useSearchUsers = (search: string) => {
  const trimmedSearch = search.trim();

  return useQuery({
    queryKey: ["search", "users", trimmedSearch],
    enabled: trimmedSearch.length > 0,
    queryFn: async () => {
      const response = await fetch(
        `/api/search/users?search=${encodeURIComponent(trimmedSearch)}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to search people");
      }

      return response.json() as Promise<SearchUsersResponse>;
    },
    staleTime: 1000 * 30,
  });
};

export const useSearchHistory = () => {
  return useQuery({
    queryKey: ["search", "history"],
    queryFn: async () => {
      const response = await fetch("/api/search/history", {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to load search history");
      }

      return response.json() as Promise<SearchHistoryResponse>;
    },
    staleTime: 1000 * 30,
  });
};

export const useClearSearchHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/search/history", {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to clear search history");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search", "history"] });
    },
  });
};

export const useTrendingDiscovery = () => {
  return useQuery({
    queryKey: ["search", "trending"],
    queryFn: async () => {
      const response = await fetch("/api/search/trending", {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to load trending discovery");
      }

      return response.json() as Promise<TrendingDiscoveryResponse>;
    },
    staleTime: 1000 * 60,
  });
};

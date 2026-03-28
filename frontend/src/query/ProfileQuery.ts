import { useUserStore } from "@/store/userStore";
import {
  ProfileConnectionsResponse,
  ProfileResponse,
} from "@/types/Types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useGetProfile = (userId?: string) => {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const response = await fetch(`/api/profile/${userId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to fetch profile");
      }
      return response.json() as Promise<ProfileResponse>;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export interface EditProfileInput {
  username?: string;
  bio?: string;
  avatar?: string;
  headerPhoto?: string;
  location?: string;
}

export const useEditProfile = () => {
  const queryClient = useQueryClient();
  const { user, setUser } = useUserStore();

  return useMutation({
    mutationFn: async (data: EditProfileInput) => {
      const response = await fetch("/api/profile/edit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: (result) => {
      if (result?.data && user) {
        setUser({
          ...user,
          ...result.data,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useFollowUser = (targetUserId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/follow/${targetUserId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to follow");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["search", "users"] });
    },
  });
};

export const useGetProfileConnections = (
  userId?: string,
  type: "followers" | "following" = "followers",
  enabled = false,
) => {
  return useQuery({
    queryKey: ["profile", userId, "connections", type],
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      const response = await fetch(
        `/api/profile/${userId}/connections?type=${type}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch connections");
      }

      return response.json() as Promise<ProfileConnectionsResponse>;
    },
    staleTime: 1000 * 30,
  });
};

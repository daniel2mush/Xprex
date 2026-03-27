import { ProfileResponse } from "@/types/Types";
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
}

export const useEditProfile = () => {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
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
      queryClient.invalidateQueries({ queryKey: ["profile", targetUserId] });
    },
  });
};

"use server";

import { AuthResponse } from "@/types/Types";
import axios from "axios";
import { cookies } from "next/headers";

interface TokensResTypes {
  refreshToken: string;
  accessToken: string;
}

export const getTokens = async (): Promise<TokensResTypes | null> => {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (!refreshToken) {
    console.log("No refreshToken cookie found");
    return null;
  }

  console.log(
    "Attempting refresh with token (first 20 chars):",
    refreshToken.slice(0, 20) + "...",
  );

  try {
    const res = await axios.post("http://localhost:4000/v1/auth/refresh", {
      refreshToken,
    });

    const { success, data } = res.data as AuthResponse;

    if (!success || !data?.accessToken) {
      console.warn("Backend rejected refresh:", res.data);
      return null;
    }

    // Same cookie options as Login/Register
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    cookieStore.set("refreshToken", data.refreshToken, cookieOptions);
    cookieStore.set("accessToken", data.accessToken, {
      ...cookieOptions,
      maxAge: 60 * 15, // 15 minutes
    });

    console.log("✅ Refresh successful — new tokens set");
    return {
      refreshToken: data.refreshToken,
      accessToken: data.accessToken,
    };
  } catch (error: any) {
    console.error("Refresh failed with details:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return null;
  }
};

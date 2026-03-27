import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  try {
    if (refreshToken) {
      await api.post("/auth/logout", { refreshToken });
    }
  } catch {
    // Clear local session even if backend logout reports an already-invalid token.
  }

  cookieStore.delete("refreshToken");
  cookieStore.delete("accessToken");

  return NextResponse.json({ success: true, message: "Logged out successfully" });
}

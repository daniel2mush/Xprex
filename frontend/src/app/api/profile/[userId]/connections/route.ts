import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";
import { ProfileConnectionsResponse } from "@/types/Types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") === "following" ? "following" : "followers";

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const { data } = await api.get(`/posts/profile/${userId}/connections`, {
      params: { type },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data as ProfileConnectionsResponse);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message =
      error.response?.data?.message ?? "Failed to fetch profile connections";

    return NextResponse.json({ success: false, message }, { status });
  }
}

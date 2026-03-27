import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";
import { SinglePostResponse } from "@/types/Types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const { data } = await api.get(`/posts/${postId}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data as SinglePostResponse);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to load post";
    return NextResponse.json({ success: false, message }, { status });
  }
}

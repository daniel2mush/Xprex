import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { commentId: string } },
) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  const value = await params;
  const commentId = value.commentId;

  try {
    const { data } = await api.delete(`/comments/api/comments/${commentId}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to delete comment";
    return NextResponse.json({ success: false, message }, { status });
  }
}

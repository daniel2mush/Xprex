import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const { postId } = await params;

  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ?? "1";
    const limit = searchParams.get("limit") ?? "20";

    const { data } = await api.get(`/comments/posts/${postId}/comments`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      params: { page, limit },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to fetch comments";
    return NextResponse.json({ success: false, message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const body = await req.json();

    const { data } = await api.post(
      `/comments/posts/${postId}/comments`,
      body,
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    );

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to create comment";
    return NextResponse.json({ success: false, message }, { status });
  }
}

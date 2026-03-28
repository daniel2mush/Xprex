import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";
import { PostResponse } from "@/types/Types";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const page = req.nextUrl.searchParams.get("page") ?? "1";
  const limit = req.nextUrl.searchParams.get("limit") ?? "10";

  try {
    const { data } = await api.get("/posts/bookmarks", {
      params: { page, limit },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data as PostResponse);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message =
      error.response?.data?.message ?? "Failed to load bookmarked posts";
    return NextResponse.json({ success: false, message }, { status });
  }
}

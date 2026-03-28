import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PostResponse } from "@/types/Types";
import api from "@/lib/Axios";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const page = req.nextUrl.searchParams.get("page") ?? "1";
  const limit = req.nextUrl.searchParams.get("limit") ?? "10";

  try {
    const { data } = await api.get("/posts/all", {
      params: { page, limit },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data as PostResponse);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to load posts";
    return NextResponse.json({ success: false, message }, { status });
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const body = await req.json();

    const { data } = await api.post("/posts/create", body, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to create post";
    return NextResponse.json({ success: false, message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";
import { AdminReportsResponse } from "@/types/Types";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const status = req.nextUrl.searchParams.get("status");
  const page = req.nextUrl.searchParams.get("page") ?? "1";
  const limit = req.nextUrl.searchParams.get("limit") ?? "20";

  const searchParams = new URLSearchParams({ page, limit });
  if (status) {
    searchParams.set("status", status);
  }

  try {
    const { data } = await api.get(`/posts/reports?${searchParams.toString()}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data as AdminReportsResponse);
  } catch (error: any) {
    const responseStatus = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to load reports";

    return NextResponse.json(
      { success: false, message },
      { status: responseStatus },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";
import { SearchUsersResponse } from "@/types/Types";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const limit = req.nextUrl.searchParams.get("limit") ?? "8";

  try {
    const { data } = await api.get("/search/users", {
      params: { search, limit },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data as SearchUsersResponse);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to search users";
    return NextResponse.json({ success: false, message }, { status });
  }
}

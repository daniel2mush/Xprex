import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";
import { SearchHistoryResponse } from "@/types/Types";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const { data } = await api.get("/search/history", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data as SearchHistoryResponse);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to load search history";
    return NextResponse.json({ success: false, message }, { status });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const { data } = await api.delete("/search/history", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to clear search history";
    return NextResponse.json({ success: false, message }, { status });
  }
}

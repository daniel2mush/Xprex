import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";
import { ConversationsResponse } from "@/types/Types";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const { data } = await api.get("/messages/conversations", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data as ConversationsResponse);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message =
      error.response?.data?.message ?? "Failed to load conversations";

    return NextResponse.json({ success: false, message }, { status });
  }
}

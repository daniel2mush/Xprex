import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const body = await req.json();
    const { data } = await api.post(`/posts/report/user/${userId}`, body, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    return NextResponse.json(data);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to report user";
    return NextResponse.json({ success: false, message }, { status });
  }
}

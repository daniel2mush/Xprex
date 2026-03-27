import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const { userId } = await params;

  try {
    const { data } = await api.post(
      `follow/${userId}`,
      {},
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    );
    return NextResponse.json(data);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to follow";
    return NextResponse.json({ success: false, message }, { status });
  }
}

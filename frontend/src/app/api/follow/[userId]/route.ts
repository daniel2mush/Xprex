import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const { data } = await api.post(
      `follow/${params.userId}`,
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

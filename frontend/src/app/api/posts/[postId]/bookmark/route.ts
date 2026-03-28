import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const { data } = await api.patch(
      `/posts/${postId}/bookmark`,
      {},
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    );

    return NextResponse.json(data);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message =
      error.response?.data?.message ?? "Failed to toggle bookmark";

    return NextResponse.json({ success: false, message }, { status });
  }
}

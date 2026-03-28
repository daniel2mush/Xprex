import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const { data } = await api.get("/notifications", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message =
      error.response?.data?.message ?? "Failed to fetch notifications";
    return NextResponse.json({ success: false, message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const body = await req.json().catch(() => ({}));
    const notificationId = body?.notificationId as string | undefined;

    if (notificationId) {
      const { data } = await api.patch(
        `/notifications/${notificationId}/read`,
        {},
        {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        },
      );

      return NextResponse.json(data);
    }

    const { data } = await api.patch(
      "/notifications/read-all",
      {},
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    );

    return NextResponse.json(data);
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to mark as read";
    return NextResponse.json({ success: false, message }, { status });
  }
}

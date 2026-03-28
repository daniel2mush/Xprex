import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";
import { UpdateReportStatusResponse } from "@/types/Types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const body = await req.json();
    const { data } = await api.patch(`/posts/reports/${reportId}`, body, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data as UpdateReportStatusResponse);
  } catch (error: any) {
    const responseStatus = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Failed to update report";

    return NextResponse.json(
      { success: false, message },
      { status: responseStatus },
    );
  }
}

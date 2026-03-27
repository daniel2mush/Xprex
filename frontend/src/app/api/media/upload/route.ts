import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import api from "@/lib/Axios";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const formData = await req.formData();

    const { data } = await api.post("/media/upload", formData, {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        // Don't set Content-Type — Axios sets multipart boundary automatically
      },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? "Upload failed";
    return NextResponse.json({ success: false, message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AxiosError } from "axios";
import api from "@/lib/Axios";

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    const body = await req.json();
    const { data } = await api.patch("profile/security", body, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    return NextResponse.json(data);
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const status = axiosError.response?.status ?? 500;
    const message =
      axiosError.response?.data?.message ?? "Failed to update account";
    return NextResponse.json({ success: false, message }, { status });
  }
}

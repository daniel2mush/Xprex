"use server";
import { cookies } from "next/headers";
import { RegisterProps, AuthResponse } from "../types/Types";
import axios from "axios";
import z from "zod";

const registrationSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
});

export const RegisterUser = async (user: RegisterProps) => {
  try {
    // 1. Fix Zod Logic: safeParse returns 'success' as a boolean
    const validation = registrationSchema.safeParse(user);

    if (!validation.success) {
      return {
        success: false,
        message: "Data not valid: " + validation.error.issues[0].message,
      };
    }

    // 2. Axial Correction: axios handles JSON stringification automatically.
    // Just pass the object. Use validation.data to ensure you use sanitized data.
    const res = await axios.post(
      `http://localhost:4000/v1/auth/register`,
      validation.data,
    );

    const { success, message, data } = res.data as AuthResponse;

    if (!success) return { success, message };

    // 3. Set Cookies: Await the cookie store once
    const cookieStore = await cookies();

    cookieStore.set("refreshToken", data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/", // Ensure the cookie is available across the whole site
      maxAge: 60 * 60 * 24 * 7, // 7 days (typical for refresh tokens)
    });

    cookieStore.set("accessToken", data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 15, // 15 minutes (typical for access tokens)
    });

    return {
      success: true,
      message,
      user: data.user,
    };
  } catch (error: any) {
    // 4. Improved Error Handling: Extract backend error message if available
    const errorMessage =
      error.response?.data?.message || "Error occurred, please try again";
    console.error("Registration Error:", error);

    return {
      success: false,
      message: errorMessage,
    };
  }
};

export const LoginUser = async (dataInfo: {
  email: string;
  password: string;
}) => {
  try {
    const res = await axios.post(
      "http://localhost:4000/v1/auth/login",
      dataInfo,
    );
    const { success, message, data } = res.data as AuthResponse;

    if (!success)
      return {
        message,
        success,
      };

    const cookieStore = await cookies();

    cookieStore.set("refreshToken", data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/", // Ensure the cookie is available across the whole site
      maxAge: 60 * 60 * 24 * 7, // 7 days (typical for refresh tokens)
    });

    cookieStore.set("accessToken", data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 15, // 15 minutes (typical for access tokens)
    });

    return {
      success: true,
      message,
      user: data.user,
    };
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message || "Error occurred, please try again";
    console.error("Registration Error:", error);

    return {
      success: false,
      message: errorMessage,
    };
  }
};

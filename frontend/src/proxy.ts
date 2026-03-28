// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Define your route categories
  const protectedPrefixes = [
    "/profile",
    "/settings",
    "/messages",
    "/explore",
    "/bookmarks",
  ];
  const authRoutes = ["/auth"];

  const refreshToken = request.cookies.get("refreshToken");
  const isProtectedRoute =
    pathname === "/" ||
    protectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

  // 2. Redirect to Login if no token is found on protected routes
  if (isProtectedRoute && !refreshToken) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // 3. Redirect to Home if user is already logged in and tries to access /auth
  if (authRoutes.includes(pathname) && refreshToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 4. Allow all other requests to proceed
  return NextResponse.next();
}

export const config = {
  // Only run the proxy on these specific paths
  matcher: [
    "/",
    "/auth",
    "/profile/:path*",
    "/settings/:path*",
    "/messages/:path*",
    "/explore/:path*",
    "/bookmarks/:path*",
  ],
};

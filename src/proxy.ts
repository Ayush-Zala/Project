import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  // If no session cookie exists, redirect to /login
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Pattern to protect all routes except login, signup, forgot-password, reset-password, verify-email, and static assets
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|signup|forgot-password|reset-password|verify-email).*)"],
};

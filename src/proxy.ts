import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  // 1. Initial Session Cookie Check
  if (!sessionCookie && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. High-Performance Dashboard Interception
  if (pathname.startsWith("/dashboard")) {
    try {
      const session = await fetch(`${request.nextUrl.origin}/api/auth/get-session`, {
        headers: request.headers,
      }).then(res => res.json()).catch(() => null);

      if (!session?.user) {
         return NextResponse.redirect(new URL("/login", request.url));
      }
    } catch (e) {
      // Background failure - allow next() to avoid blocking user if Auth API is transiently down
    }
  }

  return NextResponse.next();
}

export const config = {
  // Protect dashboard routes and non-auth API routes
  matcher: ["/dashboard/:path*", "/api/((?!auth|internal).*)"],
};

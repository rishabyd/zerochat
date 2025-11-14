import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;
  const isPublicRoute = pathname.startsWith("/sign-in");

  if (isPublicRoute && sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublicRoute && !sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except:
    // - API routes
    // - Next internals
    // - Any file with an extension (e.g., .svg, .png, .css, .js, .map, fonts)
    // - Favicons/robots/sitemaps
    "/((?!api|_next/static|_next/image|.*\\..*|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

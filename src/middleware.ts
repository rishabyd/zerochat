import { NextResponse } from "next/server";
// No-op middleware; protection is handled per-route using Better Auth.
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

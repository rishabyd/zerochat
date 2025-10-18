import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication (accessible to everyone)
const isPublicRoute = createRouteMatcher(["/", "/api/webhooks/clerk(.*)"]);

// Middleware function that runs on every request to protect routes and handle authentication
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect(); // Require authentication for non-public routes
  }
});

// Configure which routes the middleware should run on for optimal performance
export const config = {
  matcher: [
    // Match all routes except static files and Next.js internal routes for security
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Match all API routes for authentication enforcement
    "/(api|trpc)(.*)",
  ],
};

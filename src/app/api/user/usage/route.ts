import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("CRITICAL ERROR in usage API:", error);
    // STOP IMMEDIATELY - return error response to halt client operations
    return Response.json(
      {
        error: "CRITICAL: Credit system failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        stopImmediately: true,
      },
      { status: 500 }
    );
  }
}

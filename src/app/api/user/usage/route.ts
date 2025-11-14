import { getServerUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

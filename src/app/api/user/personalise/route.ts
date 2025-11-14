import { getServerUserId } from "@/lib/auth";
import { toErrorResponse } from "@/lib/services/errors";
import { getCustomPrompt } from "@/lib/services/user-profile";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getCustomPrompt({ userId });

    return NextResponse.json(profile);
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

import { toErrorResponse } from "@/lib/services/errors";
import { getCurrentUserProfile } from "@/lib/services/user-profile";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getCurrentUserProfile(userId);

    return NextResponse.json(profile);
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

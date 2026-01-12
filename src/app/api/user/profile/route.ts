import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth";
import { toErrorResponse } from "@/lib/services/errors";
import { getCurrentUserProfile } from "@/lib/services/user-profile";

export async function GET(_req: Request) {
  try {
    const userId = await getServerUserId();
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

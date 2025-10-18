"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { sanitizeSessionTitle, validateSessionId } from "../utils/sanitize";

// Sync client-created session with database
type SyncResult = {
  success: boolean;
  error?: string;
};

export async function SyncClientSession({
  sessionId,
  title,
}: {
  sessionId: string;
  title: string;
}): Promise<SyncResult> {
  try {
    const user = await auth();
    if (!user.userId) {
      return { success: false, error: "User not authenticated" };
    }

    const validatedSessionId = validateSessionId(sessionId);
    const sanitizedTitle = sanitizeSessionTitle(title);

    if (!validatedSessionId) {
      return { success: false, error: "Invalid session ID" };
    }

    const session = await prisma.chatSession.upsert({
      where: {
        id: validatedSessionId,
      },
      update: {
        title: sanitizedTitle,
        updatedAt: new Date(),
      },
      create: {
        id: validatedSessionId,
        userId: user.userId,
        title: sanitizedTitle,
      },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (session.userId !== user.userId) {
      return { success: false, error: "Session access denied" };
    }

    const wasCreated =
      session.createdAt.getTime() === session.updatedAt.getTime();
    if (wasCreated) {
      revalidatePath("");
      revalidatePath(`/${session.id}`);
    }

    return { success: true };
  } catch (error) {
    console.error("[SyncClientSession] Error:", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    return { success: false, error: "Failed to sync session" };
  }
}

export async function UpdateSession({
  sessionId,
  title,
}: {
  sessionId: string;
  title: string;
}) {
  const user = await auth();
  if (!user.userId) throw new Error("User not authenticated");

  try {
    // Validate and sanitize inputs
    const validatedSessionId = validateSessionId(sessionId);
    const sanitizedTitle = sanitizeSessionTitle(title);

    const updatedSession = await prisma.chatSession.update({
      where: { id_userId: { id: validatedSessionId, userId: user.userId } },
      data: { title: sanitizedTitle },
    });

    // Invalidate user sessions cache since session was updated
    revalidatePath(`/${updatedSession.id}`);

    return updatedSession;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Session not found or not authorised to update");
  }
}

export async function DeleteSession({ sessionId }: { sessionId: string }) {
  const user = await auth();
  if (!user.userId) throw new Error("User not authenticated");

  try {
    // Validate session ID
    const validatedSessionId = validateSessionId(sessionId);

    const deletedSession = await prisma.chatSession.delete({
      where: { id_userId: { id: validatedSessionId, userId: user.userId } },
    });

    // Invalidate user sessions cache since session was deleted
    revalidatePath(`/${deletedSession.id}`);

    return deletedSession;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Session not found or not authorised to delete");
  }
}

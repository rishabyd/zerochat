import { getServerUserId } from "@/lib/auth";
import { saveAiMessage, saveUserMessage } from "../services/user-chat";

export async function saveMessage({
  sessionId,
  content,
  role,
  model,
  complexity,
}: {
  sessionId: string;
  content: string;
  role: "AI" | "USER";
  model?: string;
  complexity?: number;
}) {
  // Validate input parameters
  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("Invalid sessionId");
  }

  if (!content || typeof content !== "string") {
    throw new Error("Invalid content");
  }

  if (!role || !["AI", "USER"].includes(role)) {
    throw new Error("Invalid role");
  }
  if (!model || !complexity) {
    throw new Error("fields missing ");
  }

  const userId = await getServerUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    if (role === "USER") {
      const message = await saveUserMessage({
        userId,
        sessionId,
        content,
      });
      return message;
    }
    if (role === "AI") {
      const message = await saveAiMessage({
        userId,
        sessionId,
        content,
        model,
      });
      return message;
    }
  } catch (error) {
    console.error("Failed to save message:", {
      error: error instanceof Error ? error.message : error,
      sessionId,
      role,
      contentLength: content.length,
      userId,
      model,
      complexity,
    });

    // Check for specific database errors
    if (error instanceof Error) {
      if (error.message.includes("foreign key constraint")) {
        throw new Error("Invalid session or user");
      }
      if (error.message.includes("unique constraint")) {
        throw new Error("Message already exists");
      }
    }

    throw new Error("Failed to save message to database");
  }
}

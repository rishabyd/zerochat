import { getSession } from "@/lib/services/user-sessions";
import { auth } from "@/lib/auth";
import { UIDataTypes, UIMessage, UITools } from "ai";
import { headers } from "next/headers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authSession = await auth.api.getSession({ headers: await headers() });
    const userId = authSession?.user.id;
    if (!userId)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await params;
    if (!sessionId) {
      return Response.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const chatSession = await getSession(userId, sessionId);

    const sessionMetadata = {
      id: chatSession?.id,
      createdAt: chatSession?.createdAt,
      title: chatSession?.title,
    };
    // Convert database messages to UIMessage format
    const messages: UIMessage<unknown, UIDataTypes, UITools>[] =
      chatSession?.messages.map((msg) => ({
        id: msg.id,
        role: msg.role === "USER" ? "user" : "assistant",
        parts: [{ type: "text", text: msg.content }],
        createdAt: msg.createdAt,
      })) || [];

    return Response.json({ ...sessionMetadata, messages });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("maintenance")) {
      return Response.json(
        {
          error: "Chat is currently under maintenance. Please try again later.",
        },
        { status: 503 }
      );
    }

    console.error("Failed to retrieve session history:", error);
    return Response.json(
      { error: "Failed to retrieve session history" },
      { status: 500 }
    );
  }
}

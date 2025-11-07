import SessionWrapper from "@/components/chat/session-wrapper";
import { getSession } from "@/lib/services/user-sessions";
import { getServerUserId } from "@/lib/auth";
import type { UIDataTypes, UIMessage, UITools } from "ai";

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ "session-id": string }>;
}) {
  const { "session-id": sessionId } = await params;

  try {
    const userId = await getServerUserId();
    const session = await getSession(userId!, sessionId);

    // Convert database messages to UI message format for initial render
    const seedMessages: UIMessage<unknown, UIDataTypes, UITools>[] = (
      session?.messages || []
    ).map((m) => ({
      id: m.id,
      role:
        m.role === "USER" ? "user" : m.role === "AI" ? "assistant" : "system",
      parts: [{ type: "text", text: m.content }],
      createdAt: m.createdAt,
    }));

    // Render session with existing messages for instant display
    return (
      <SessionWrapper sessionId={sessionId} initialMessages={seedMessages} />
    );
  } catch {
    // Session doesn't exist yet (client-created), render wrapper without initial messages
    return <SessionWrapper sessionId={sessionId} />;
  }
}

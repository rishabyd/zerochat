import { prisma } from "../prisma";

export async function saveUserMessage({
  userId,
  sessionId,
  content,
}: {
  userId: string;
  sessionId: string;
  content: string;
}) {
  if (!userId) {
    throw new Error(`userId missing!`);
  }
  if (!sessionId) throw new Error("sessionId missing");

  const message = await prisma.chatMessage.create({
    data: {
      sessionId,
      content: content.trim(),
      role: "USER",
      userId,
    },
  });
  return message;
}

export async function saveAiMessage({
  userId,
  sessionId,
  content,
  model,
}: {
  userId: string;
  sessionId: string;
  content: string;
  model: string;
}) {
  if (!userId) {
    throw new Error(`userId missing!`);
  }
  if (!sessionId) throw new Error("sessionId missing");

  const message = await prisma.chatMessage.create({
    data: {
      sessionId,
      content: content.trim(),
      role: "AI",
      userId,
      modelUsed: model,
    },
  });
  return message;
}

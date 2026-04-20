import { prisma } from '../prisma';

export async function getSessions(userId: string) {
  if (!userId) {
    throw new Error(`userId missing!`);
  }

  const sessions = await prisma.chatSession.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return sessions;
}

export async function getSession(userId: string, sessionId: string) {
  if (!userId) {
    throw new Error(`userId missing!`);
  }
  if (!sessionId) throw new Error('sessionId missing');

  const session = await prisma.chatSession.findUnique({
    where: {
      id_userId: { userId, id: sessionId },
    },
    select: {
      title: true,
      id: true,

      createdAt: true,

      messages: {
        orderBy: { createdAt: 'asc' },
        take: 22,
      },
    },
  });
  return session;
}

import { prisma } from '@/lib/prisma';
import type { UnifiedProfile } from '@/lib/types';

export async function getCurrentUserProfile(userId: string): Promise<UnifiedProfile> {
  if (!userId) throw new Error('Unauthorized');

  const db = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      settings: { select: { instructions: true } },
    },
  });
  if (!db) {
    throw new Error(`Profile not found in db`);
  }

  const unified: UnifiedProfile = {
    id: db.id,
    email: db.email ?? undefined,
    firstName: db.name?.split(' ')[0] ?? undefined,
    lastName: db.name?.split(' ').slice(1).join(' ') || undefined,
    imageUrl: db.image ?? undefined,
  };

  return unified;
}

export async function getCustomPrompt({ userId }: { userId: string }) {
  const data = await prisma.userSettings.findUnique({
    where: { userId },
    select: { instructions: true },
  });
  return data?.instructions;
}
export async function saveCustomPrompt({ userId, text }: { userId: string; text: string }) {
  const data = await prisma.userSettings.upsert({
    where: { userId },
    update: { instructions: text },
    create: { userId, instructions: text },
  });

  return data.instructions ?? '';
}

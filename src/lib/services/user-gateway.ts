import { prisma } from '@/lib/prisma';

export async function getUserGatewayKey(userId: string): Promise<string | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { gatewayKey: true },
  });
  return settings?.gatewayKey ?? null;
}

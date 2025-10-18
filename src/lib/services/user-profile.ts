import { prisma } from "@/lib/prisma";
import type { UnifiedProfile } from "@/lib/types";
import { getUserCache, setUserCache } from "../redis/userCache";

export async function getCurrentUserProfile(
  userId: string
): Promise<UnifiedProfile> {
  if (!userId) throw new Error("Unauthorized");
  const cachedProfile = await getUserCache(userId);
  if (cachedProfile) {
    console.log(`cache hit - userprofile`);

    return cachedProfile;
  }

  const db = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      imageUrl: true,
    },
  });
  if (!db) {
    throw new Error(`Profile not found in db`);
  }

  // Handle plan-specific data normalization
  const unified: UnifiedProfile = {
    id: db.id,
    email: db.email ?? undefined,
    firstName: db.firstName ?? undefined,
    lastName: db.lastName ?? undefined,
    imageUrl: db.imageUrl ?? undefined,
  };
  await setUserCache(userId, unified);
  console.log(`data query for userprofile`);

  return unified;
}

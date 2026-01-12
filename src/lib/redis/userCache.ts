import redis from "../redis";
import type { UnifiedProfile } from "../types";

function getUserIdKey(userId: string): string {
  return `user:${userId}`;
}

export async function setUserCache(userId: string, userData: UnifiedProfile): Promise<void> {
  await redis.setex(getUserIdKey(userId), 3600, JSON.stringify(userData));
}

export async function getUserCache(userId: string): Promise<UnifiedProfile | null> {
  const cached = await redis.getex(getUserIdKey(userId), { ex: 3600 });
  return (cached as UnifiedProfile) || null;
}

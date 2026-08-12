import {
  decryptCredential,
  encryptCredential,
  type EncryptedCredential,
} from '@/lib/security/credential-encryption';
import { prisma } from '@/lib/prisma';

export const VERCEL_AI_GATEWAY_PROVIDER = 'vercel-ai-gateway';

type UserGatewayCredentialMetadata = {
  hasKey: boolean;
  masked: string | null;
};

function maskLastFour(lastFour: string): string {
  return `••••••••${lastFour}`;
}

function getCredentialWhere(userId: string) {
  return {
    userId_provider: {
      userId,
      provider: VERCEL_AI_GATEWAY_PROVIDER,
    },
  };
}

function validateGatewayKey(gatewayKey: string): string {
  const trimmedKey = gatewayKey.trim();

  if (!trimmedKey?.startsWith('vck_')) {
    throw new Error('Invalid gateway key format');
  }

  return trimmedKey;
}

export async function getUserGatewayKeyMetadata(
  userId: string
): Promise<UserGatewayCredentialMetadata> {
  const credential = await prisma.userCredential.findUnique({
    where: getCredentialWhere(userId),
    select: { lastFour: true },
  });

  if (!credential) {
    return { hasKey: false, masked: null };
  }

  return { hasKey: true, masked: maskLastFour(credential.lastFour) };
}

export async function replaceUserGatewayKey(userId: string, gatewayKey: string): Promise<void> {
  const trimmedKey = validateGatewayKey(gatewayKey);
  const encrypted = encryptCredential(trimmedKey, {
    provider: VERCEL_AI_GATEWAY_PROVIDER,
    userId,
  });

  await prisma.userCredential.upsert({
    where: getCredentialWhere(userId),
    update: {
      ...encrypted,
      lastFour: trimmedKey.slice(-4),
    },
    create: {
      ...encrypted,
      lastFour: trimmedKey.slice(-4),
      provider: VERCEL_AI_GATEWAY_PROVIDER,
      userId,
    },
  });
}

export async function deleteUserGatewayKey(userId: string): Promise<void> {
  await prisma.userCredential.deleteMany({
    where: {
      provider: VERCEL_AI_GATEWAY_PROVIDER,
      userId,
    },
  });
}

export async function getUserGatewayKey(userId: string): Promise<string | null> {
  const credential = await prisma.userCredential.findUnique({
    where: getCredentialWhere(userId),
    select: {
      authTag: true,
      ciphertext: true,
      encryptionVersion: true,
      iv: true,
    },
  });

  if (!credential) {
    return null;
  }

  const encrypted: EncryptedCredential = {
    authTag: credential.authTag,
    ciphertext: credential.ciphertext,
    encryptionVersion: credential.encryptionVersion,
    iv: credential.iv,
  };

  return decryptCredential(encrypted, {
    provider: VERCEL_AI_GATEWAY_PROVIDER,
    userId,
  });
}

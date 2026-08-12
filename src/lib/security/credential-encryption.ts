/**
 * Server-only credential encryption. Keep this module out of client imports.
 * The node:crypto dependency also prevents this implementation from running in a browser.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const CURRENT_ENCRYPTION_VERSION = 1;
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

export type CredentialContext = {
  userId: string;
  provider: string;
};

export type EncryptedCredential = {
  ciphertext: string;
  iv: string;
  authTag: string;
  encryptionVersion: number;
};

function decodeBase64(value: string, name: string): Buffer {
  const normalized = value.trim();

  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) {
    throw new Error(`${name} must be valid base64`);
  }

  return Buffer.from(normalized, 'base64');
}

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.CREDENTIAL_ENCRYPTION_KEY_V1;

  if (!encodedKey) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY_V1 is not configured');
  }

  const key = decodeBase64(encodedKey, 'CREDENTIAL_ENCRYPTION_KEY_V1');

  if (key.length !== 32) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY_V1 must decode to 32 bytes');
  }

  return key;
}

function getAssociatedData(context: CredentialContext, encryptionVersion: number): Buffer {
  return Buffer.from(
    JSON.stringify({
      encryptionVersion,
      provider: context.provider,
      userId: context.userId,
    }),
    'utf8'
  );
}

export function encryptCredential(
  plaintext: string,
  context: CredentialContext
): EncryptedCredential {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  cipher.setAAD(getAssociatedData(context, CURRENT_ENCRYPTION_VERSION));

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    encryptionVersion: CURRENT_ENCRYPTION_VERSION,
  };
}

export function decryptCredential(
  encrypted: EncryptedCredential,
  context: CredentialContext
): string {
  if (encrypted.encryptionVersion !== CURRENT_ENCRYPTION_VERSION) {
    throw new Error(`Unsupported credential encryption version: ${encrypted.encryptionVersion}`);
  }

  const iv = decodeBase64(encrypted.iv, 'Credential IV');
  const authTag = decodeBase64(encrypted.authTag, 'Credential authentication tag');

  if (iv.length !== IV_LENGTH_BYTES) {
    throw new Error('Credential IV has an invalid length');
  }

  if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new Error('Credential authentication tag has an invalid length');
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAAD(getAssociatedData(context, encrypted.encryptionVersion));
  decipher.setAuthTag(authTag);

  const ciphertext = decodeBase64(encrypted.ciphertext, 'Credential ciphertext');
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return plaintext.toString('utf8');
}

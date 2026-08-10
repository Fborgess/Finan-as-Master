// Credential hashing (PBKDF2-SHA256 via Web Crypto) for PINs and passwords.
// Stores salted hashes instead of plaintext secrets.
import type { User } from '../types';

const PBKDF2_ITERATIONS = 150000;
const SALT_BYTES = 16;

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
};

export function generateSalt(): string {
  const bytes = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function isCryptoSubtleAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

export async function hashSecret(secret: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: hexToBytes(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

async function verifySecret(
  secret: string,
  salt: string | undefined,
  expectedHash: string | undefined,
): Promise<boolean> {
  if (!salt || !expectedHash) return false;
  const computed = await hashSecret(secret, salt);
  return computed === expectedHash;
}

/**
 * Verifies a secret (PIN) against a user, supporting both the current hashed
 * format and the legacy plaintext format during migration.
 */
export async function verifyUserPin(user: User, secret: string): Promise<boolean> {
  if (user.pinHash && user.pinSalt) {
    return verifySecret(secret, user.pinSalt, user.pinHash);
  }
  return user.pin !== undefined && user.pin === secret;
}

/**
 * Verifies a password against a user, supporting both hashed and legacy formats.
 */
export async function verifyUserPassword(user: User, secret: string): Promise<boolean> {
  if (user.passwordHash && user.passwordSalt) {
    return verifySecret(secret, user.passwordSalt, user.passwordHash);
  }
  return user.password !== undefined && user.password === secret;
}

/**
 * Checks if the user still has plaintext credentials that need migration.
 */
export function needsMigration(user: User): boolean {
  return Boolean(
    (user.pin !== undefined && !user.pinHash) ||
      (user.password !== undefined && !user.passwordHash),
  );
}

/**
 * Hashes plaintext credentials in place, returning a new user object with
 * the hash/salt fields set and the plaintext fields removed.
 */
export async function hashUserCredentials(user: User): Promise<User> {
  const next: User = { ...user };
  if (user.pin !== undefined && !user.pinHash) {
    const salt = generateSalt();
    next.pinSalt = salt;
    next.pinHash = await hashSecret(user.pin, salt);
  }
  if (user.password !== undefined && !user.passwordHash) {
    const salt = generateSalt();
    next.passwordSalt = salt;
    next.passwordHash = await hashSecret(user.password, salt);
  }
  delete next.pin;
  delete next.password;
  return next;
}

/**
 * Migrates a list of users, hashing any plaintext credentials.
 * Falls back to the original list if Web Crypto is unavailable.
 */
export async function migrateUserCredentials(users: User[]): Promise<User[]> {
  if (!isCryptoSubtleAvailable()) return users;
  let changed = false;
  const migrated = await Promise.all(
    users.map(async (u) => {
      if (needsMigration(u)) {
        changed = true;
        return hashUserCredentials(u);
      }
      return u;
    }),
  );
  return changed ? migrated : users;
}

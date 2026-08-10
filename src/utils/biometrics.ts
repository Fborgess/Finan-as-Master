// Utility for Native Mobile / Android / iOS WebAuthn Biometric Verification
import { safeLocalStorage } from './safeStorage';

export interface BiometricAuthResult {
  success: boolean;
  native: boolean;
  error?: string;
}

/**
 * Checks if the device supports native platform biometrics (Fingerprint / Face ID)
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
    return false;
  }
  // If running inside an iframe or embedded preview, WebAuthn can throw SecurityError
  try {
    if (window.self !== window.top) {
      return false;
    }
  } catch (e) {
    return false;
  }

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Converts ArrayBuffer / Uint8Array to Base64URL string
 */
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Converts Base64URL string to Uint8Array
 */
function base64UrlToBuffer(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Registers/Creates a WebAuthn platform credential on Android/iOS
 * Triggers the OS system dialog (Fingerprint sensor / Face scan)
 */
export async function registerBiometricCredential(): Promise<boolean> {
  if (!(await isBiometricAvailable())) return false;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    // Get current hostname or fallback
    const hostname = window.location.hostname || 'localhost';

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Finanças Pessoais',
        },
        user: {
          id: userId,
          name: 'usuario_app',
          displayName: 'Usuário do App',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Enforce hardware fingerprint / face sensor
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (credential) {
      const credIdBase64 = bufferToBase64Url(credential.rawId);
      safeLocalStorage.setItem('fm_biometric_cred_id', credIdBase64);
      return true;
    }
  } catch (err: any) {
    console.warn('WebAuthn registration error or user canceled:', err);
  }
  return false;
}

/**
 * Authenticates using native Android / iOS WebAuthn Biometrics
 * Falls back gracefully or returns result status
 */
export async function authenticateWithBiometrics(): Promise<BiometricAuthResult> {
  const supported = await isBiometricAvailable();
  if (!supported) {
    return { success: false, native: false, error: 'unsupported' };
  }

  const savedCredId = safeLocalStorage.getItem('fm_biometric_cred_id');
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  // 1. If we already have a saved credential, attempt navigator.credentials.get
  if (savedCredId) {
    try {
      const rawCredId = base64UrlToBuffer(savedCredId);
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          allowCredentials: [
            {
              id: rawCredId,
              type: 'public-key',
              transports: ['internal'],
            },
          ],
        },
      });

      if (assertion) {
        return { success: true, native: true };
      }
    } catch (e: any) {
      console.log('Saved credential authentication error:', e);
      if (e.name === 'NotAllowedError') {
        // User deliberately canceled the Android biometric dialog
        return { success: false, native: true, error: 'canceled' };
      }
    }
  }

  // 2. If no saved credential exists or get failed, register new credential
  // This directly triggers Android BiometricPrompt system popup!
  try {
    const registered = await registerBiometricCredential();
    if (registered) {
      return { success: true, native: true };
    }
  } catch (e: any) {
    if (e.name === 'NotAllowedError') {
      return { success: false, native: true, error: 'canceled' };
    }
  }

  return { success: false, native: false, error: 'failed' };
}

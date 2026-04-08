/**
 * Optional local encrypted storage for org + PAT (user passphrase via WebCrypto).
 * Used only when the user opts in to "Remember on this device".
 */

const STORAGE_KEY = "aclara.credential.v1";

/** Satisfies `SubtleCrypto` BufferSource typing (avoids SharedArrayBuffer variance). */
function asBufferSource(data: Uint8Array): BufferSource {
  return data as BufferSource;
}

export interface IVaultPayload {
  readonly v: 1;
  readonly saltB64: string;
  readonly ivB64: string;
  readonly ciphertextB64: string;
}

export interface IStoredCredentials {
  readonly org: string;
  readonly pat: string;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = utf8Encode(passphrase);
  const baseKey = await crypto.subtle.importKey("raw", asBufferSource(enc), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asBufferSource(salt),
      iterations: 210_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts org + PAT into a JSON-serializable payload for localStorage.
 */
export async function encryptCredentials(
  creds: IStoredCredentials,
  passphrase: string
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plain = utf8Encode(JSON.stringify(creds));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBufferSource(iv) },
    key,
    asBufferSource(plain)
  );
  const payload: IVaultPayload = {
    v: 1,
    saltB64: bytesToB64(salt),
    ivB64: bytesToB64(iv),
    ciphertextB64: bytesToB64(new Uint8Array(ciphertext)),
  };
  return JSON.stringify(payload);
}

/**
 * Decrypts payload produced by `encryptCredentials`.
 */
export async function decryptCredentials(
  storedJson: string,
  passphrase: string
): Promise<IStoredCredentials> {
  const raw = JSON.parse(storedJson) as unknown;
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid vault payload");
  }
  const o = raw as Record<string, unknown>;
  if (o["v"] !== 1) {
    throw new Error("Unsupported vault version");
  }
  const saltB64 = o["saltB64"];
  const ivB64 = o["ivB64"];
  const ciphertextB64 = o["ciphertextB64"];
  if (
    typeof saltB64 !== "string" ||
    typeof ivB64 !== "string" ||
    typeof ciphertextB64 !== "string"
  ) {
    throw new Error("Invalid vault payload fields");
  }
  const salt = b64ToBytes(saltB64);
  const iv = b64ToBytes(ivB64);
  const ciphertext = b64ToBytes(ciphertextB64);
  const key = await deriveKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBufferSource(iv) },
    key,
    asBufferSource(ciphertext)
  );
  const parsed = JSON.parse(utf8Decode(new Uint8Array(decrypted))) as unknown;
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid decrypted credentials");
  }
  const c = parsed as Record<string, unknown>;
  const org = c["org"];
  const pat = c["pat"];
  if (typeof org !== "string" || typeof pat !== "string") {
    throw new Error("Invalid credential shape");
  }
  return { org, pat };
}

export function readVaultFromLocalStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeVaultToLocalStorage(payloadJson: string): void {
  localStorage.setItem(STORAGE_KEY, payloadJson);
}

export function clearVaultFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

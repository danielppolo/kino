import crypto from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey() {
  const rawKey = process.env.PLAID_TOKEN_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error("PLAID_TOKEN_ENCRYPTION_KEY is not configured");
  }

  const base64Key = Buffer.from(rawKey, "base64");
  if (base64Key.length === 32) {
    return base64Key;
  }

  const utf8Key = Buffer.from(rawKey, "utf8");
  if (utf8Key.length === 32) {
    return utf8Key;
  }

  throw new Error(
    "PLAID_TOKEN_ENCRYPTION_KEY must be a 32-byte key or base64-encoded 32-byte key",
  );
}

export function encryptPlaidAccessToken(accessToken: string) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(accessToken, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted]
    .map((part) => part.toString("base64"))
    .join(":");
}

export function decryptPlaidAccessToken(encryptedValue: string) {
  const [ivB64, authTagB64, cipherTextB64] = encryptedValue.split(":");

  if (!ivB64 || !authTagB64 || !cipherTextB64) {
    throw new Error("Invalid encrypted Plaid token format");
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(ivB64, "base64"),
  );

  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherTextB64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

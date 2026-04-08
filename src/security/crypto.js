'use strict';

/**
 * AES-256-GCM encryption / decryption utility.
 * (Prompt 4: designed by a backend security expert)
 *
 * Security choices:
 *  - AES-256-GCM provides authenticated encryption (prevents ciphertext tampering).
 *  - PBKDF2 with 100 000 iterations derives a fixed-length key from raw key material.
 *  - A random 96-bit IV (recommended for GCM) is generated per encryption.
 *  - Auth tag (128 bits) and IV travel with the ciphertext as a single payload string.
 *  - The CRYPTO_SALT env var binds key derivation to the deployment; change it if the
 *    key material is rotated or the environment is rebuilt.
 *
 * Payload format (base64 sections separated by ":"):
 *   <iv_b64>:<auth_tag_b64>:<ciphertext_b64>
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;   // 256 bits
const IV_BYTES  = 12;   // 96 bits – NIST recommended for GCM
const TAG_BYTES = 16;   // 128-bit authentication tag

// ---------------------------------------------------------------------------
// Internal key derivation
// ---------------------------------------------------------------------------

/**
 * Derives a 32-byte key from arbitrary key material using PBKDF2-SHA-256.
 * The salt is read from the environment so that the derived key is
 * environment-specific and cannot be computed by an attacker who only
 * knows the raw key material.
 *
 * @param {string|Buffer} rawKey
 * @returns {Buffer} 32-byte derived key
 */
function deriveKey(rawKey) {
  const salt = process.env.CRYPTO_SALT;
  if (!salt) {
    throw new Error(
      '[crypto] CRYPTO_SALT environment variable is not set. ' +
      'Set a strong random value before using encryption.'
    );
  }
  return crypto.pbkdf2Sync(rawKey, salt, 100_000, KEY_BYTES, 'sha256');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encrypts a plaintext string with AES-256-GCM.
 *
 * @param {string}        plaintext - The string to encrypt
 * @param {string|Buffer} key       - Raw key material (will be derived via PBKDF2)
 * @returns {string} Serialised payload: <iv>:<authTag>:<ciphertext> (all base64)
 * @throws {TypeError}  If plaintext is not a string
 * @throws {Error}      If CRYPTO_SALT is not set
 */
function encrypt(plaintext, key) {
  if (typeof plaintext !== 'string') {
    throw new TypeError(`encrypt() expects a string, received: ${typeof plaintext}`);
  }

  const derivedKey = deriveKey(key);
  const iv         = crypto.randomBytes(IV_BYTES);

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv, {
    authTagLength: TAG_BYTES,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypts a payload produced by `encrypt()`.
 *
 * @param {string}        payload - Serialised payload: <iv>:<authTag>:<ciphertext>
 * @param {string|Buffer} key     - Same raw key material used during encryption
 * @returns {string} Original plaintext
 * @throws {TypeError} If payload is not a string
 * @throws {Error}     If the payload format is invalid or authentication fails
 */
function decrypt(payload, key) {
  if (typeof payload !== 'string') {
    throw new TypeError(`decrypt() expects a string payload, received: ${typeof payload}`);
  }

  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('[crypto] Invalid payload format. Expected <iv>:<authTag>:<ciphertext>.');
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv         = Buffer.from(ivB64, 'base64');
  const authTag    = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const derivedKey = deriveKey(key);

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv, {
    authTagLength: TAG_BYTES,
  });
  decipher.setAuthTag(authTag);

  // createDecipheriv throws if authentication fails (tampered ciphertext)
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { encrypt, decrypt };

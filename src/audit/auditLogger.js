'use strict';

/**
 * Audit Logger
 * ---------------------------------------------------------------------------
 * Writes audit entries to a JSON mock database file.
 *
 * Each entry stores:
 *  - timestamp            – ISO timestamp added automatically
 *  - userId               – identifier from the request
 *  - originalEncrypted    – original message encrypted with AES-256-GCM
 *  - redactedMessage      – sanitized message in plaintext
 *  - status               – SUCCESS or ERROR
 *
 * Environment variables:
 *   AUDIT_LOG_KEY   – Raw key material for AES encryption (required in production).
 *   AUDIT_DB_PATH   – Absolute path to the JSON mock database (default: <project>/logs/audit-db.json).
 */

const fs   = require('fs');
const path = require('path');
const { encrypt } = require('../security/crypto');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function resolveLogKey() {
  const key = process.env.AUDIT_LOG_KEY;
  if (!key) {
    process.stderr.write(
      '[audit] WARNING: AUDIT_LOG_KEY is not set. ' +
      'Audit entries will not be encrypted properly. Set this variable in production.\n'
    );
    return 'insecure-default-key-do-not-use-in-production';
  }
  return key;
}

const DB_FILE = process.env.AUDIT_DB_PATH
  || path.join(__dirname, '../../logs/audit-db.json');

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Writes an audit entry to the JSON mock database.
 *
 * @param {object} entry
 * @param {string} [entry.userId]          - User identifier.
 * @param {string} [entry.originalMessage] - Raw message to be encrypted before storing.
 * @param {string} [entry.redactedMessage] - Sanitized message stored in plaintext.
 * @param {string} entry.status            - 'SUCCESS' or 'ERROR'.
 */
function writeAuditLog(entry) {
  const { originalMessage, ...rest } = entry;

  const record = {
    timestamp: new Date().toISOString(),
    ...rest,
  };

  // Encrypt the original message if present
  if (typeof originalMessage === 'string') {
    try {
      record.originalEncrypted = encrypt(originalMessage, resolveLogKey());
    } catch (err) {
      process.stderr.write(`[audit] Encryption failed: ${err.message}\n`);
      record.originalEncrypted = null;
    }
  }

  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let db = [];
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(raw);
    }

    db.push(record);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    process.stderr.write(`[audit] Failed to write entry: ${err.message}\n`);
  }
}

module.exports = { writeAuditLog };

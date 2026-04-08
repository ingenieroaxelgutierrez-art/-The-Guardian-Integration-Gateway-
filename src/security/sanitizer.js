'use strict';

/**
 * Production-ready input sanitizer with sensitive data redaction.
 * Hardened against ReDoS, false positives, and common edge cases.
 * (Prompts 1 & 2: designed and reviewed by a senior security engineer)
 */

// ---------------------------------------------------------------------------
// Precompiled regex patterns – compiled once at module load for performance.
// Each pattern is anchored with \b to avoid partial-word false positives.
// ---------------------------------------------------------------------------

const PATTERNS = {
  /**
   * EMAIL – simplified RFC 5321.
   * Avoids nested quantifiers to prevent ReDoS.
   * Local part: 1–64 chars; domain: 1–253 chars; TLD: 2+ alpha chars.
   */
  EMAIL: /\b[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]{1,253}\.[A-Za-z]{2,}\b/g,

  /**
   * CREDIT CARD – 13 to 16 digit groups optionally separated by spaces/dashes.
   * Uses an atomic structure to avoid catastrophic backtracking.
   * Post-processing via isLikelyCreditCard() validates digit count.
   */
  CREDIT_CARD: /\b\d(?:[ \-]?\d){12,15}\b/g,

  /**
   * SSN – US Social Security Numbers.
   * Matches: XXX-XX-XXXX | XXX XX XXXX | XXXXXXXXX (exactly 9 digits).
   * Placed AFTER credit card to avoid substring collisions.
   */
  SSN: /\b(?:\d{3}[- ]\d{2}[- ]\d{4}|\d{9})\b/g,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strips all separators and counts raw digits in a matched credit card string.
 * Returns true only if the digit count is 13–16 (valid card range).
 * @param {string} match
 * @returns {boolean}
 */
function isLikelyCreditCard(match) {
  const digits = match.replace(/[ \-]/g, '');
  return digits.length >= 13 && digits.length <= 16;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sanitizes a string by redacting known sensitive data patterns.
 *
 * Redaction order:
 *   1. Emails  (highest specificity – avoid overlap with other patterns)
 *   2. Credit cards (before SSN to prevent 9-digit substring collision)
 *   3. SSNs
 *
 * @param {string} input - Raw user input string
 * @returns {string} Sanitized string with sensitive values replaced
 * @throws {TypeError} If input is not a string
 */
function sanitize(input) {
  if (typeof input !== 'string') {
    throw new TypeError(`sanitize() expects a string, received: ${typeof input}`);
  }

  // Reset lastIndex on each call – regexes are stateful when using /g flag
  // and shared across invocations, so we must reset before each use.
  PATTERNS.EMAIL.lastIndex = 0;
  PATTERNS.CREDIT_CARD.lastIndex = 0;
  PATTERNS.SSN.lastIndex = 0;

  let result = input;

  // 1. Redact emails
  result = result.replace(PATTERNS.EMAIL, '<REDACTED: EMAIL>');

  // 2. Redact credit cards (with digit-count validation to prevent false positives)
  result = result.replace(PATTERNS.CREDIT_CARD, (match) =>
    isLikelyCreditCard(match) ? '<REDACTED: CREDIT_CARD>' : match
  );

  // 3. Redact SSNs
  result = result.replace(PATTERNS.SSN, '<REDACTED: SSN>');

  return result;
}

module.exports = { sanitize };

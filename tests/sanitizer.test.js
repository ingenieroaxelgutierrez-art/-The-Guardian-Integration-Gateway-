'use strict';

/**
 * Unit tests for src/security/sanitizer.js
 * (Prompt 6: generated with Jest)
 *
 * Coverage targets:
 *  - Email redaction
 *  - Credit card redaction (plain, dashes, spaces)
 *  - SSN redaction (formatted and unformatted)
 *  - No false positives on normal numbers / phone numbers / zip codes
 *  - Edge cases: empty string, non-string input, mixed sensitive data
 */

const { sanitize } = require('../src/security/sanitizer');

// ---------------------------------------------------------------------------
// Email redaction
// ---------------------------------------------------------------------------
describe('sanitize – email redaction', () => {
  test('redacts a standard email address', () => {
    expect(sanitize('Contact us at user@example.com for help.'))
      .toBe('Contact us at <REDACTED: EMAIL> for help.');
  });

  test('redacts an email with a plus sign in the local part', () => {
    expect(sanitize('Send invoice to billing+finance@company.co.uk'))
      .toBe('Send invoice to <REDACTED: EMAIL>');
  });

  test('redacts an email with dots in the local part', () => {
    expect(sanitize('john.doe@subdomain.example.org'))
      .toBe('<REDACTED: EMAIL>');
  });

  test('does NOT redact a string with @ but no valid TLD', () => {
    const input = 'user@localhost';
    // No TLD  (< 2 alpha chars after last dot) – should not be redacted
    expect(sanitize(input)).toBe(input);
  });

  test('redacts multiple emails in one string', () => {
    const result = sanitize('From: a@test.com To: b@test.com');
    expect(result).toBe('From: <REDACTED: EMAIL> To: <REDACTED: EMAIL>');
  });
});

// ---------------------------------------------------------------------------
// Credit card redaction
// ---------------------------------------------------------------------------
describe('sanitize – credit card redaction', () => {
  test('redacts a 16-digit card (no separators)', () => {
    expect(sanitize('Card number: 4111111111111111'))
      .toBe('Card number: <REDACTED: CREDIT_CARD>');
  });

  test('redacts a 16-digit card with dashes', () => {
    expect(sanitize('4111-1111-1111-1111')).toBe('<REDACTED: CREDIT_CARD>');
  });

  test('redacts a 16-digit card with spaces', () => {
    expect(sanitize('4111 1111 1111 1111')).toBe('<REDACTED: CREDIT_CARD>');
  });

  test('redacts a 13-digit card (Visa short format)', () => {
    expect(sanitize('Visa: 4222222222222')).toBe('Visa: <REDACTED: CREDIT_CARD>');
  });

  test('does NOT redact a 5-digit zip code', () => {
    const input = 'Zip code: 90210';
    expect(sanitize(input)).toBe(input);
  });

  test('does NOT redact a regular 8-digit number', () => {
    const input = 'Order #12345678';
    expect(sanitize(input)).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// SSN redaction
// ---------------------------------------------------------------------------
describe('sanitize – SSN redaction', () => {
  test('redacts a formatted SSN (XXX-XX-XXXX)', () => {
    expect(sanitize('SSN: 123-45-6789')).toBe('SSN: <REDACTED: SSN>');
  });

  test('redacts a formatted SSN with spaces (XXX XX XXXX)', () => {
    expect(sanitize('ID: 123 45 6789')).toBe('ID: <REDACTED: SSN>');
  });

  test('redacts an unformatted 9-digit SSN', () => {
    expect(sanitize('ID number: 123456789')).toBe('ID number: <REDACTED: SSN>');
  });
});

// ---------------------------------------------------------------------------
// False positive prevention
// ---------------------------------------------------------------------------
describe('sanitize – false positive prevention', () => {
  test('does NOT redact a short number (< 9 digits)', () => {
    const input = 'Ref #1234567';
    expect(sanitize(input)).toBe(input);
  });

  test('does NOT redact a 10-digit phone number', () => {
    // 10 digits – not a credit card (< 13) and not an SSN (not 9)
    const input = 'Call 8005551234';
    expect(sanitize(input)).toBe(input);
  });

  test('does NOT redact a formatted US phone number', () => {
    const input = 'Call +1-800-555-1234';
    expect(sanitize(input)).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('sanitize – edge cases', () => {
  test('returns an empty string unchanged', () => {
    expect(sanitize('')).toBe('');
  });

  test('returns a plain string with no sensitive data unchanged', () => {
    const input = 'Hello, world! Nothing sensitive here.';
    expect(sanitize(input)).toBe(input);
  });

  test('throws TypeError for null input', () => {
    expect(() => sanitize(null)).toThrow(TypeError);
  });

  test('throws TypeError for numeric input', () => {
    expect(() => sanitize(42)).toThrow(TypeError);
  });

  test('throws TypeError for undefined input', () => {
    expect(() => sanitize(undefined)).toThrow(TypeError);
  });

  test('redacts multiple sensitive values in a single string', () => {
    const input   = 'Email: test@test.com | Card: 4111111111111111 | SSN: 123-45-6789';
    const result  = sanitize(input);
    expect(result).toBe(
      'Email: <REDACTED: EMAIL> | Card: <REDACTED: CREDIT_CARD> | SSN: <REDACTED: SSN>'
    );
  });

  test('handles very long input within one second (performance guard)', () => {
    const longInput = ('Hello user@domain.com, your number is 4111111111111111. ').repeat(500);
    const start = Date.now();
    sanitize(longInput);
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

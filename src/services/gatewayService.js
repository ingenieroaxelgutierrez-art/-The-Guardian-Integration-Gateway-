'use strict';

/**
 * Gateway Service
 * ---------------------------------------------------------------------------
 * Orchestrates the core business logic:
 *   1. Sanitize raw message (security layer)
 *   2. Call the mock AI through the circuit breaker (resilience)
 *
 * This layer is intentionally free of HTTP concerns.
 */

const { sanitize }       = require('../security/sanitizer');
const { CircuitBreaker } = require('../resilience/circuitBreaker');

// ---------------------------------------------------------------------------
// Circuit breaker – one shared instance per process
// ---------------------------------------------------------------------------

const breaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 10_000,
  onStateChange: (newState, prevState) => {
    console.log(
      `[CircuitBreaker] ${prevState ?? 'INIT'} → ${newState}`
    );
  },
});

// ---------------------------------------------------------------------------
// Mock AI call stub
// ---------------------------------------------------------------------------

/**
 * Simulates an asynchronous call to an external AI service.
 * Waits 2 seconds then returns a fixed "Generated Answer".
 *
 * @returns {Promise<string>}
 */
function callMockAi() {
  return new Promise((resolve) => {
    setTimeout(() => resolve('Generated Answer'), 2000);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Processes a raw message end-to-end.
 *
 * @param {string} rawMessage - Unsanitized message from the controller
 * @returns {Promise<{ answer: string, redacted: string }>}
 * @throws {Error} If the circuit is open or the mock AI call fails
 */
async function process(rawMessage) {
  // Step 1 – sanitize: strip/redact sensitive data before any outbound call
  const redacted = sanitize(rawMessage);

  // Step 2 – execute through circuit breaker: fail fast on repeated errors
  const answer = await breaker.execute(() => callMockAi());

  return { answer, redacted };
}

module.exports = { process, breaker };

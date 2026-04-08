'use strict';

/**
 * Production-ready Circuit Breaker implementation.
 * (Prompt 3: designed by a senior distributed systems engineer)
 *
 * States:
 *   CLOSED    – Normal operation. Requests pass through.
 *   OPEN      – Failure threshold exceeded. Requests are rejected immediately.
 *   HALF_OPEN – Test window after reset timeout. One call is allowed through.
 *               Success → CLOSED. Failure → OPEN again.
 */

const STATES = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

class CircuitBreaker {
  /**
   * @param {object}   [options]
   * @param {number}   [options.failureThreshold=3]   Consecutive failures before opening.
   * @param {number}   [options.resetTimeout=10000]   Ms to wait before moving to HALF_OPEN.
   * @param {Function} [options.onStateChange]        Callback invoked on state transitions.
   */
  constructor({
    failureThreshold = 3,
    resetTimeout = 10000,
    onStateChange = null,
  } = {}) {
    if (failureThreshold < 1) throw new RangeError('failureThreshold must be >= 1');
    if (resetTimeout < 0) throw new RangeError('resetTimeout must be >= 0');

    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.onStateChange = onStateChange;

    this._state = STATES.CLOSED;
    this._failureCount = 0;
    this._nextAttemptAt = null;
  }

  /** Current circuit state (read-only). */
  get state() {
    return this._state;
  }

  /** Number of consecutive failures recorded (read-only). */
  get failureCount() {
    return this._failureCount;
  }

  // --------------------------------------------------------------------------
  // Core execution
  // --------------------------------------------------------------------------

  /**
   * Executes `fn` through the circuit breaker.
   *
   * @param {Function} fn - Async function to protect (must return a Promise)
   * @returns {Promise<*>} Resolves with fn's result or rejects with its error
   * @throws {Error} When the circuit is OPEN and the reset window has not elapsed
   */
  async execute(fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('CircuitBreaker.execute() requires a function argument');
    }

    if (this._state === STATES.OPEN) {
      if (Date.now() < this._nextAttemptAt) {
        const retryAt = new Date(this._nextAttemptAt).toISOString();
        throw new Error(`[CircuitBreaker] Circuit is OPEN. Next attempt allowed at ${retryAt}.`);
      }
      // Reset window has elapsed – allow a single probe
      this._transition(STATES.HALF_OPEN);
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // Internal state machine
  // --------------------------------------------------------------------------

  _onSuccess() {
    this._failureCount = 0;
    this._nextAttemptAt = null;
    this._transition(STATES.CLOSED);
  }

  _onFailure() {
    this._failureCount += 1;

    const shouldOpen =
      this._state === STATES.HALF_OPEN ||
      this._failureCount >= this.failureThreshold;

    if (shouldOpen) {
      this._nextAttemptAt = Date.now() + this.resetTimeout;
      this._transition(STATES.OPEN);
    }
  }

  _transition(newState) {
    if (this._state === newState) return;
    const prev = this._state;
    this._state = newState;

    if (typeof this.onStateChange === 'function') {
      try {
        this.onStateChange(newState, prev);
      } catch (_) {
        // Swallow errors in the callback to protect the breaker itself
      }
    }
  }
}

module.exports = { CircuitBreaker, STATES };

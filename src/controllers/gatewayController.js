'use strict';

/**
 * Gateway Controller
 * ---------------------------------------------------------------------------
 * Handles HTTP concerns only:
 *   - Extract validated request data (userId + message)
 *   - Delegate processing to the service layer
 *   - Write audit entry with encrypted original + plaintext redacted message
 *   - Return a consistent JSON response
 */

const gatewayService    = require('../services/gatewayService');
const { writeAuditLog } = require('../audit/auditLogger');

/**
 * POST /secure-inquiry
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function}                   next
 */
async function processInput(req, res, next) {
  const { userId, message } = req.body;

  try {
    const { answer, redacted } = await gatewayService.process(message);

    writeAuditLog({
      userId,
      originalMessage: message,   // will be encrypted inside writeAuditLog
      redactedMessage: redacted,  // stored as plaintext
      status: 'SUCCESS',
    });

    return res.status(200).json({ success: true, answer });
  } catch (err) {
    writeAuditLog({
      userId,
      status:  'ERROR',
      message: err.message,
    });

    next(err);
  }
}

module.exports = { processInput };

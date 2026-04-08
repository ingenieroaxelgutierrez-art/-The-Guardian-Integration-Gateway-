'use strict';

/**
 * Input Validation Middleware
 * ---------------------------------------------------------------------------
 * Validates the shape and size of incoming requests BEFORE they reach the
 * service layer. This is the first security boundary inside the application.
 *
 * Rules enforced:
 *  - `userId` field must be present and must be a non-empty string.
 *  - `message` field must be present and must be a non-empty string.
 *  - `message` must not exceed 10 000 characters (prevent memory abuse).
 */

const MAX_INPUT_LENGTH = 10_000;

/**
 * Express middleware that validates the `userId` and `message` fields in the request body.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function}                   next
 */
function validateInput(req, res, next) {
  const { userId, message } = req.body ?? {};

  if (userId === undefined || userId === null) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: "userId".',
    });
  }

  if (typeof userId !== 'string' || userId.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Field "userId" must be a non-empty string.',
    });
  }

  if (message === undefined || message === null) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: "message".',
    });
  }

  if (typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Field "message" must be a string.',
    });
  }

  if (message.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Field "message" must not be empty.',
    });
  }

  if (message.length > MAX_INPUT_LENGTH) {
    return res.status(413).json({
      success: false,
      error: `Field "message" exceeds maximum length of ${MAX_INPUT_LENGTH} characters.`,
    });
  }

  next();
}

module.exports = { validateInput };

'use strict';

const { validate } = require('./validate');

/**
 * Returns an Express-compatible middleware that validates `req.body` against
 * the provided schema.
 *
 * - Validation passes  → calls next().
 * - Validation fails   → HTTP 400 with structured JSON errors.
 * - Internal errors are caught and never exposed to clients.
 *
 * @param {object} schema  - Validation schema (same format as validate()).
 * @param {object} [options]
 * @param {boolean} [options.abortEarly=false] - Stop after the first error.
 * @returns {Function} Express middleware: (req, res, next) => void
 */
function validateRequest(schema, options = {}) {
  return function validifyMiddleware(req, res, next) {
    try {
      const data = req.body;

      // Treat a missing or non-object body as an empty object so required
      // field errors are still reported correctly.
      const safeData =
        data && typeof data === 'object' && !Array.isArray(data) ? data : {};

      const result = validate(safeData, schema, options);

      if (!result.valid) {
        return res.status(400).json({ valid: false, errors: result.errors });
      }

      return next();
    } catch (_err) {
      // Never expose internal details to the client.
      return res.status(400).json({
        valid: false,
        errors: [{ field: '_request', message: 'Request validation failed' }],
      });
    }
  };
}

module.exports = { validateRequest };

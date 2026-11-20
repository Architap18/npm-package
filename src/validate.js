'use strict';

const { validateRequired } = require('./validators/required');
const { validateEmail } = require('./validators/email');
const { validatePassword } = require('./validators/password');
const { validateString } = require('./validators/string');
const { validateNumber } = require('./validators/number');
const { validateCustom } = require('./validators/custom');
const { validatePattern } = require('./validators/pattern');
const { validateEnum } = require('./validators/enum');
const { validateMatchesField } = require('./validators/matchesField');

/**
 * Returns true when the value is considered "absent" (undefined, null, or
 * empty string). Used to decide whether optional fields should be skipped.
 */
function isAbsent(value) {
  return value === undefined || value === null || value === '';
}

/**
 * Validates a single data object against a schema, with an optional field
 * path prefix for use in nested validation.
 *
 * @param {object} data
 * @param {object} schema
 * @param {object} options         - { abortEarly?: boolean }
 * @param {string} [pathPrefix=''] - Dot-separated prefix for nested field paths.
 * @returns {Array<{ field: string, message: string }>} Collected errors.
 */
function validateObject(data, schema, options, pathPrefix) {
  const { abortEarly = false } = options;
  const errors = [];

  for (const key of Object.keys(schema)) {
    const rule = schema[key];
    const fieldPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) continue;

    const value = data[key];

    // ── Optional short-circuit ────────────────────────────────────────────
    // When a field is not marked required AND its value is absent, skip ALL
    // further rules for this field. This makes every field implicitly optional
    // unless required: true is set.
    if (!rule.required && isAbsent(value)) {
      // Still run nested validation guard: if the rule has a nested schema
      // key but the value is absent, there is nothing to validate.
      continue;
    }

    // ── Nested object ─────────────────────────────────────────────────────
    // When a rule carries a `schema` key, treat the field's value as a nested
    // object and recurse. Required / absent handling for the parent field is
    // still performed above first.
    if (rule.schema) {
      const nestedData =
        value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      const nestedErrors = validateObject(nestedData, rule.schema, options, fieldPath);
      for (const e of nestedErrors) {
        errors.push(e);
        if (abortEarly) return errors;
      }
      // Required check on the parent field itself still runs below if the
      // nested object was absent.
      if (!isAbsent(value)) continue;
    }

    // ── Required ──────────────────────────────────────────────────────────
    const requiredError = validateRequired(fieldPath, value, rule);
    if (requiredError) {
      errors.push({ field: fieldPath, message: requiredError });
      // No further checks make sense when the value is absent.
      if (abortEarly) return errors;
      continue;
    }

    // All remaining validators only run when the value is present.

    // ── Email ─────────────────────────────────────────────────────────────
    const emailError = validateEmail(fieldPath, value, rule);
    if (emailError) {
      errors.push({ field: fieldPath, message: emailError });
      if (abortEarly) return errors;
    }

    // ── Password ──────────────────────────────────────────────────────────
    for (const msg of validatePassword(fieldPath, value, rule)) {
      errors.push({ field: fieldPath, message: msg });
      if (abortEarly) return errors;
    }

    // ── String ────────────────────────────────────────────────────────────
    for (const msg of validateString(fieldPath, value, rule)) {
      errors.push({ field: fieldPath, message: msg });
      if (abortEarly) return errors;
    }

    // ── Number ────────────────────────────────────────────────────────────
    for (const msg of validateNumber(fieldPath, value, rule)) {
      errors.push({ field: fieldPath, message: msg });
      if (abortEarly) return errors;
    }

    // ── Pattern ───────────────────────────────────────────────────────────
    const patternError = validatePattern(fieldPath, value, rule);
    if (patternError) {
      errors.push({ field: fieldPath, message: patternError });
      if (abortEarly) return errors;
    }

    // ── Enum ──────────────────────────────────────────────────────────────
    const enumError = validateEnum(fieldPath, value, rule);
    if (enumError) {
      errors.push({ field: fieldPath, message: enumError });
      if (abortEarly) return errors;
    }

    // ── matchesField ──────────────────────────────────────────────────────
    const matchError = validateMatchesField(fieldPath, value, rule, data);
    if (matchError) {
      errors.push({ field: fieldPath, message: matchError });
      if (abortEarly) return errors;
    }

    // ── Custom ────────────────────────────────────────────────────────────
    const customError = validateCustom(fieldPath, value, rule);
    if (customError) {
      errors.push({ field: fieldPath, message: customError });
      if (abortEarly) return errors;
    }
  }

  return errors;
}

/**
 * Validates a plain data object against a schema.
 *
 * Returns { valid: boolean, errors: Array<{ field: string, message: string }> }.
 * The input object is never mutated.
 *
 * @param {object} data
 * @param {object} schema
 * @param {object} [options]
 * @param {boolean} [options.abortEarly=false] - Stop after the first error.
 * @returns {{ valid: boolean, errors: Array<{ field: string, message: string }> }}
 */
function validate(data, schema, options = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: [{ field: '_input', message: 'Data must be a plain object' }],
    };
  }

  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return {
      valid: false,
      errors: [{ field: '_schema', message: 'Schema must be a plain object' }],
    };
  }

  const errors = validateObject(data, schema, options, '');
  return { valid: errors.length === 0, errors };
}

module.exports = { validate };

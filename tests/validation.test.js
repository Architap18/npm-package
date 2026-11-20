'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { validate } = require('../src/validate');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fieldsWithErrors(result) {
  return result.errors.map((e) => e.field);
}

// ─────────────────────────────────────────────────────────────────────────────
// Guard / defensive
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – guards', () => {
  test('returns error when data is not an object', () => {
    const result = validate('not-an-object', {});
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].field, '_input');
  });

  test('returns error when schema is not an object', () => {
    const result = validate({}, 'not-a-schema');
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].field, '_schema');
  });

  test('returns error when data is an array', () => {
    const result = validate([], {});
    assert.equal(result.valid, false);
  });

  test('skips non-object rule entries silently', () => {
    const result = validate({ name: 'Alice' }, { name: null });
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Required
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – required', () => {
  const schema = { name: { required: true } };

  test('passes when required field is present', () => {
    const result = validate({ name: 'Alice' }, schema);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  test('fails when required field is missing', () => {
    const result = validate({}, schema);
    assert.equal(result.valid, false);
    assert.ok(fieldsWithErrors(result).includes('name'));
  });

  test('fails when required field is null', () => {
    const result = validate({ name: null }, schema);
    assert.equal(result.valid, false);
  });

  test('fails when required field is undefined', () => {
    const result = validate({ name: undefined }, schema);
    assert.equal(result.valid, false);
  });

  test('fails when required field is an empty string', () => {
    const result = validate({ name: '' }, schema);
    assert.equal(result.valid, false);
  });

  test('fails when required field is a whitespace-only string', () => {
    const result = validate({ name: '   ' }, schema);
    assert.equal(result.valid, false);
  });

  test('uses custom message when provided', () => {
    const s = { name: { required: true, message: 'Name is mandatory' } };
    const result = validate({}, s);
    assert.equal(result.errors[0].message, 'Name is mandatory');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// String length
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – string length', () => {
  test('passes within minLength and maxLength', () => {
    const schema = { username: { minLength: 3, maxLength: 20 } };
    const result = validate({ username: 'Alice' }, schema);
    assert.equal(result.valid, true);
  });

  test('fails when value is shorter than minLength', () => {
    const schema = { username: { minLength: 5 } };
    const result = validate({ username: 'Bob' }, schema);
    assert.equal(result.valid, false);
    assert.ok(fieldsWithErrors(result).includes('username'));
  });

  test('fails when value exceeds maxLength', () => {
    const schema = { username: { maxLength: 5 } };
    const result = validate({ username: 'VeryLongUsername' }, schema);
    assert.equal(result.valid, false);
  });

  test('passes at exactly minLength', () => {
    const schema = { username: { minLength: 3 } };
    const result = validate({ username: 'Bob' }, schema);
    assert.equal(result.valid, true);
  });

  test('passes at exactly maxLength', () => {
    const schema = { username: { maxLength: 5 } };
    const result = validate({ username: 'Alice' }, schema);
    assert.equal(result.valid, true);
  });

  test('skips length checks when value is absent', () => {
    const schema = { username: { minLength: 3 } };
    const result = validate({}, schema);
    // required was not set, so it should pass silently
    assert.equal(result.valid, true);
  });

  test('type: "string" fails for non-string values', () => {
    const schema = { label: { type: 'string' } };
    const result = validate({ label: 42 }, schema);
    assert.equal(result.valid, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Number
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – number', () => {
  test('passes valid number within range', () => {
    const schema = { age: { type: 'number', min: 18, max: 100 } };
    const result = validate({ age: 25 }, schema);
    assert.equal(result.valid, true);
  });

  test('fails when value is a string not a number', () => {
    const schema = { age: { type: 'number' } };
    const result = validate({ age: 'twenty' }, schema);
    assert.equal(result.valid, false);
  });

  test('fails when value is NaN', () => {
    const schema = { age: { type: 'number' } };
    const result = validate({ age: NaN }, schema);
    assert.equal(result.valid, false);
  });

  test('fails when value is below min', () => {
    const schema = { age: { type: 'number', min: 18 } };
    const result = validate({ age: 16 }, schema);
    assert.equal(result.valid, false);
  });

  test('fails when value is above max', () => {
    const schema = { age: { type: 'number', max: 100 } };
    const result = validate({ age: 150 }, schema);
    assert.equal(result.valid, false);
  });

  test('passes at exactly min boundary', () => {
    const schema = { age: { type: 'number', min: 18 } };
    const result = validate({ age: 18 }, schema);
    assert.equal(result.valid, true);
  });

  test('passes at exactly max boundary', () => {
    const schema = { age: { type: 'number', max: 100 } };
    const result = validate({ age: 100 }, schema);
    assert.equal(result.valid, true);
  });

  test('skips number checks when value is absent', () => {
    const schema = { age: { type: 'number', min: 18 } };
    const result = validate({}, schema);
    assert.equal(result.valid, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multiple rules on one field
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – multiple rules', () => {
  test('collects multiple errors for one field', () => {
    const schema = {
      password: {
        required: true,
        minLength: 8,
        uppercase: true,
        number: true,
      },
    };
    const result = validate({ password: 'abc' }, schema);
    assert.equal(result.valid, false);
    // Should have multiple errors for the password field
    const passErrors = result.errors.filter((e) => e.field === 'password');
    assert.ok(passErrors.length >= 2);
  });

  test('collects errors from multiple fields', () => {
    const schema = {
      name: { required: true },
      email: { required: true, email: true },
    };
    const result = validate({ email: 'not-an-email' }, schema);
    assert.equal(result.valid, false);
    const fields = fieldsWithErrors(result);
    assert.ok(fields.includes('name'));
    assert.ok(fields.includes('email'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Custom validation
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – custom validator', () => {
  test('passes when custom function returns true', () => {
    const schema = {
      username: {
        custom: (v) => v.length >= 3,
        message: 'Username must be at least 3 characters',
      },
    };
    const result = validate({ username: 'Alice' }, schema);
    assert.equal(result.valid, true);
  });

  test('fails when custom function returns false', () => {
    const schema = {
      username: {
        custom: (v) => v.length >= 3,
        message: 'Username must be at least 3 characters',
      },
    };
    const result = validate({ username: 'Al' }, schema);
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].message, 'Username must be at least 3 characters');
  });

  test('does not crash when custom function throws', () => {
    const schema = {
      field: {
        custom: () => { throw new Error('oops'); },
        message: 'Custom validation error',
      },
    };
    const result = validate({ field: 'value' }, schema);
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].message, 'Custom validation error');
  });

  test('skips custom check when value is absent', () => {
    const schema = {
      field: {
        custom: () => false,
        message: 'Should not appear',
      },
    };
    const result = validate({}, schema);
    // required not set, value absent → custom should be skipped
    assert.equal(result.valid, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Input immutability
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – immutability', () => {
  test('does not mutate the input data object', () => {
    const data = Object.freeze({ name: 'Alice', age: 25 });
    const schema = { name: { required: true }, age: { type: 'number', min: 18 } };
    assert.doesNotThrow(() => validate(data, schema));
  });
});

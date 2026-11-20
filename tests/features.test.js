'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { validate } = require('../src/validate');

// ─────────────────────────────────────────────────────────────────────────────
// Pattern validation
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – pattern', () => {
  test('passes when value matches the regex', () => {
    const schema = { phone: { pattern: /^[6-9]\d{9}$/ } };
    const result = validate({ phone: '9876543210' }, schema);
    assert.equal(result.valid, true);
  });

  test('fails when value does not match the regex', () => {
    const schema = { phone: { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid Indian mobile number' } };
    const result = validate({ phone: '12345' }, schema);
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].message, 'Enter a valid Indian mobile number');
  });

  test('uses a default error message when none is supplied', () => {
    const schema = { code: { pattern: /^[A-Z]{3}$/ } };
    const result = validate({ code: 'ab' }, schema);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].message.includes('code'));
  });

  test('skips pattern check when value is absent', () => {
    const schema = { phone: { pattern: /^\d{10}$/ } };
    const result = validate({}, schema);
    assert.equal(result.valid, true);
  });

  test('skips pattern check when rule.pattern is not a RegExp', () => {
    const schema = { phone: { pattern: '\\d+' } };
    const result = validate({ phone: 'hello' }, schema);
    assert.equal(result.valid, true);
  });

  test('coerces numeric values to string before testing pattern', () => {
    const schema = { pin: { pattern: /^\d{4}$/ } };
    const result = validate({ pin: 1234 }, schema);
    assert.equal(result.valid, true);
  });

  test('Indian mobile number – valid numbers starting with 6-9', () => {
    const schema = { mobile: { required: true, pattern: /^[6-9]\d{9}$/, message: 'Invalid mobile number' } };
    assert.equal(validate({ mobile: '6000000000' }, schema).valid, true);
    assert.equal(validate({ mobile: '7000000000' }, schema).valid, true);
    assert.equal(validate({ mobile: '8000000000' }, schema).valid, true);
    assert.equal(validate({ mobile: '9000000000' }, schema).valid, true);
  });

  test('Indian mobile number – rejects numbers starting with 0-5', () => {
    const schema = { mobile: { required: true, pattern: /^[6-9]\d{9}$/, message: 'Invalid mobile number' } };
    assert.equal(validate({ mobile: '5000000000' }, schema).valid, false);
    assert.equal(validate({ mobile: '1234567890' }, schema).valid, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Enum validation
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – enum', () => {
  const schema = { role: { required: true, enum: ['admin', 'user', 'moderator'] } };

  test('passes when value is in the allowed list', () => {
    assert.equal(validate({ role: 'admin' }, schema).valid, true);
    assert.equal(validate({ role: 'user' }, schema).valid, true);
    assert.equal(validate({ role: 'moderator' }, schema).valid, true);
  });

  test('fails when value is not in the allowed list', () => {
    const result = validate({ role: 'superuser' }, schema);
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].field, 'role');
  });

  test('error message lists allowed values', () => {
    const result = validate({ role: 'superuser' }, schema);
    const msg = result.errors[0].message;
    assert.ok(msg.includes('"admin"'));
    assert.ok(msg.includes('"user"'));
  });

  test('uses a custom error message when provided', () => {
    const s = { status: { enum: ['active', 'inactive'], message: 'Bad status' } };
    const result = validate({ status: 'deleted' }, s);
    assert.equal(result.errors[0].message, 'Bad status');
  });

  test('skips enum check when value is absent', () => {
    const s = { role: { enum: ['admin', 'user'] } };
    const result = validate({}, s);
    assert.equal(result.valid, true);
  });

  test('skips enum check when rule.enum is an empty array', () => {
    const s = { role: { enum: [] } };
    const result = validate({ role: 'anything' }, s);
    assert.equal(result.valid, true);
  });

  test('skips enum check when rule.enum is not an array', () => {
    const s = { role: { enum: 'admin' } };
    const result = validate({ role: 'guest' }, s);
    assert.equal(result.valid, true);
  });

  test('works with numeric enum values', () => {
    const s = { priority: { enum: [1, 2, 3] } };
    assert.equal(validate({ priority: 2 }, s).valid, true);
    assert.equal(validate({ priority: 5 }, s).valid, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Optional fields
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – optional fields', () => {
  test('skips all rules for an optional absent field', () => {
    const schema = { nickname: { minLength: 3, maxLength: 20, email: true } };
    const result = validate({}, schema);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  test('validates an optional field when it is present', () => {
    const schema = { nickname: { minLength: 3 } };
    assert.equal(validate({ nickname: 'Al' }, schema).valid, false);
    assert.equal(validate({ nickname: 'Alice' }, schema).valid, true);
  });

  test('skips validation for optional null field', () => {
    const schema = { bio: { maxLength: 200 } };
    const result = validate({ bio: null }, schema);
    assert.equal(result.valid, true);
  });

  test('skips validation for optional empty-string field', () => {
    const schema = { bio: { maxLength: 200 } };
    const result = validate({ bio: '' }, schema);
    assert.equal(result.valid, true);
  });

  test('required field still fails when absent alongside optional fields', () => {
    const schema = {
      name: { required: true },
      bio: { maxLength: 200 },
    };
    const result = validate({ bio: null }, schema);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === 'name'));
    assert.ok(!result.errors.some((e) => e.field === 'bio'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-field: matchesField
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – matchesField', () => {
  const schema = {
    password: { required: true, minLength: 8 },
    confirmPassword: { required: true, matchesField: 'password' },
  };

  test('passes when confirmPassword matches password', () => {
    const result = validate({ password: 'Secret123', confirmPassword: 'Secret123' }, schema);
    assert.equal(result.valid, true);
  });

  test('fails when confirmPassword does not match password', () => {
    const result = validate({ password: 'Secret123', confirmPassword: 'Other456' }, schema);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === 'confirmPassword'));
  });

  test('uses a custom error message', () => {
    const s = {
      password: { required: true },
      confirmPassword: { required: true, matchesField: 'password', message: 'Passwords do not match' },
    };
    const result = validate({ password: 'abc', confirmPassword: 'xyz' }, s);
    assert.equal(result.errors[0].message, 'Passwords do not match');
  });

  test('skips matchesField check when the confirming field is absent', () => {
    const s = { confirmPassword: { matchesField: 'password' } };
    const result = validate({ password: 'secret' }, s);
    // confirmPassword is absent and not required → entire field skipped
    assert.equal(result.valid, true);
  });

  test('reports error when matchesField target does not exist in data', () => {
    const s = { confirmPassword: { required: true, matchesField: 'password' } };
    const result = validate({ confirmPassword: 'abc' }, s);
    // password is not in data, so data['password'] === undefined ≠ 'abc'
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].field, 'confirmPassword');
  });

  test('skips check when rule.matchesField is not a string', () => {
    const s = { field: { required: true, matchesField: 42 } };
    const result = validate({ field: 'hello' }, s);
    assert.equal(result.valid, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Nested object validation
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – nested schema', () => {
  const schema = {
    address: {
      required: true,
      schema: {
        city: { required: true, minLength: 2 },
        zip:  { required: true, pattern: /^\d{6}$/, message: 'zip must be a 6-digit code' },
      },
    },
  };

  test('passes when nested object is valid', () => {
    const result = validate(
      { address: { city: 'Mumbai', zip: '400001' } },
      schema
    );
    assert.equal(result.valid, true);
  });

  test('reports dotted field paths for nested errors', () => {
    const result = validate(
      { address: { city: 'A', zip: 'BAD' } },
      schema
    );
    assert.equal(result.valid, false);
    const fields = result.errors.map((e) => e.field);
    assert.ok(fields.includes('address.city'));
    assert.ok(fields.includes('address.zip'));
  });

  test('reports nested required errors when parent object is empty', () => {
    const result = validate({ address: {} }, schema);
    assert.equal(result.valid, false);
    const fields = result.errors.map((e) => e.field);
    assert.ok(fields.includes('address.city'));
    assert.ok(fields.includes('address.zip'));
  });

  test('treats absent nested object as empty for nested required checks', () => {
    // address is required at the top level; its absence should produce a
    // required error for address itself, not for nested fields.
    const result = validate({}, schema);
    assert.equal(result.valid, false);
    // Top-level required error only
    assert.ok(result.errors.some((e) => e.field === 'address'));
  });

  test('skips optional nested schema when parent is absent', () => {
    const s = {
      address: {
        schema: {
          city: { required: true },
        },
      },
    };
    const result = validate({}, s);
    assert.equal(result.valid, true);
  });

  test('supports three-level nesting', () => {
    const s = {
      company: {
        required: true,
        schema: {
          address: {
            required: true,
            schema: {
              city: { required: true },
            },
          },
        },
      },
    };
    const result = validate({ company: { address: {} } }, s);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === 'company.address.city'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// abortEarly option
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – abortEarly', () => {
  const schema = {
    name:  { required: true, minLength: 3 },
    email: { required: true, email: true },
    age:   { required: true, type: 'number', min: 18 },
  };

  test('returns all errors when abortEarly is false (default)', () => {
    const result = validate({}, schema);
    assert.ok(result.errors.length >= 3);
  });

  test('returns only one error when abortEarly is true', () => {
    const result = validate({}, schema, { abortEarly: true });
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 1);
  });

  test('returns valid:true when data is valid regardless of abortEarly', () => {
    const result = validate(
      { name: 'Alice', email: 'alice@example.com', age: 25 },
      schema,
      { abortEarly: true }
    );
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  test('abortEarly stops mid-field when multiple errors exist on one field', () => {
    const s = {
      password: { required: true, minLength: 12, uppercase: true, number: true },
    };
    const result = validate({ password: 'ab' }, s, { abortEarly: true });
    assert.equal(result.errors.length, 1);
  });

  test('abortEarly stops across fields', () => {
    const result = validate(
      { name: 'Al', email: 'bad', age: 10 },
      schema,
      { abortEarly: true }
    );
    assert.equal(result.errors.length, 1);
  });

  test('abortEarly works with nested schemas', () => {
    const s = {
      address: {
        required: true,
        schema: {
          city: { required: true },
          zip:  { required: true },
        },
      },
    };
    const result = validate({ address: {} }, s, { abortEarly: true });
    assert.equal(result.errors.length, 1);
  });

  test('abortEarly defaults to false when option is omitted', () => {
    const s = { a: { required: true }, b: { required: true } };
    const result = validate({}, s);
    assert.equal(result.errors.length, 2);
  });
});

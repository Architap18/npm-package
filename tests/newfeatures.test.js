'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { validate } = require('../src/validate');
const { combineSchemas } = require('../src/combineSchemas');
const { sanitizeValue, sanitizeObject } = require('../src/sanitize');

// ─────────────────────────────────────────────────────────────────────────────
// Feature 1: Sanitization
// ─────────────────────────────────────────────────────────────────────────────

describe('sanitizeValue()', () => {
  test('trims leading and trailing whitespace', () => {
    assert.equal(sanitizeValue('  hello  ', { trim: true }), 'hello');
  });

  test('returns non-string values unchanged', () => {
    assert.equal(sanitizeValue(42, { trim: true }), 42);
    assert.equal(sanitizeValue(null, { trim: true }), null);
  });

  test('no-op when no sanitization keys present', () => {
    assert.equal(sanitizeValue('  hello  ', {}), '  hello  ');
  });

  // lowercase/uppercase sanitization is skipped when any password strength
  // key is present (uppercase, lowercase, number, specialChar).
  // This avoids modifying passwords before strength-checking.
  test('skips case transforms when password strength keys are present', () => {
    assert.equal(sanitizeValue('allowercase', { uppercase: true }), 'allowercase');
    assert.equal(sanitizeValue('ALLCAPS', { lowercase: true }), 'ALLCAPS');
    // trim still applies
    assert.equal(sanitizeValue('  pwd  ', { trim: true, uppercase: true }), 'pwd');
  });
});

describe('validate() – sanitization', () => {
  test('trims whitespace and validates on the trimmed value', () => {
    // Email with leading/trailing spaces would fail regex without trim.
    const schema = { email: { required: true, trim: true, email: true } };
    const result = validate({ email: '  alice@example.com  ' }, schema);
    assert.equal(result.valid, true);
    assert.equal(result.data.email, 'alice@example.com');
  });

  test('does not mutate the original input object', () => {
    const input = { name: '  Alice  ' };
    const schema = { name: { required: true, trim: true } };
    validate(input, schema);
    assert.equal(input.name, '  Alice  ');
  });

  test('result.data is always present even without sanitization rules', () => {
    const schema = { name: { required: true } };
    const result = validate({ name: 'Alice' }, schema);
    assert.ok('data' in result);
    assert.equal(result.data.name, 'Alice');
  });

  test('trim works in nested objects', () => {
    const schema = {
      address: {
        required: true,
        schema: {
          city: { required: true, trim: true },
        },
      },
    };
    const result = validate({ address: { city: '  Mumbai  ' } }, schema);
    assert.equal(result.valid, true);
    assert.equal(result.data.address.city, 'Mumbai');
  });

  test('sanitized data is returned on validation failure too', () => {
    const schema = { email: { required: true, trim: true, email: true } };
    const result = validate({ email: '  bad  ' }, schema);
    assert.equal(result.valid, false);
    assert.equal(result.data.email, 'bad'); // trimmed even on failure
  });

  test('trim does not affect non-string values', () => {
    const schema = { score: { required: true, trim: true, type: 'number' } };
    const result = validate({ score: 42 }, schema);
    assert.equal(result.valid, true);
    assert.equal(result.data.score, 42);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature 2: Array Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – array', () => {
  test('passes for a valid array', () => {
    const schema = { tags: { type: 'array', minItems: 1, maxItems: 5 } };
    const result = validate({ tags: ['a', 'b'] }, schema);
    assert.equal(result.valid, true);
  });

  test('fails when value is not an array', () => {
    const schema = { tags: { type: 'array' } };
    const result = validate({ tags: 'not-an-array' }, schema);
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].field, 'tags');
  });

  test('fails when array has fewer items than minItems', () => {
    const schema = { tags: { type: 'array', minItems: 2 } };
    const result = validate({ tags: ['a'] }, schema);
    assert.equal(result.valid, false);
  });

  test('fails when array has more items than maxItems', () => {
    const schema = { tags: { type: 'array', maxItems: 2 } };
    const result = validate({ tags: ['a', 'b', 'c'] }, schema);
    assert.equal(result.valid, false);
  });

  test('passes at exactly minItems', () => {
    const schema = { tags: { type: 'array', minItems: 2 } };
    assert.equal(validate({ tags: ['a', 'b'] }, schema).valid, true);
  });

  test('passes at exactly maxItems', () => {
    const schema = { tags: { type: 'array', maxItems: 2 } };
    assert.equal(validate({ tags: ['a', 'b'] }, schema).valid, true);
  });

  test('fails when uniqueItems is violated', () => {
    const schema = { tags: { type: 'array', uniqueItems: true } };
    const result = validate({ tags: ['a', 'b', 'a'] }, schema);
    assert.equal(result.valid, false);
  });

  test('passes when uniqueItems and all items are unique', () => {
    const schema = { tags: { type: 'array', uniqueItems: true } };
    assert.equal(validate({ tags: ['a', 'b', 'c'] }, schema).valid, true);
  });

  test('skips array check when value is absent and not required', () => {
    const schema = { tags: { type: 'array', minItems: 1 } };
    assert.equal(validate({}, schema).valid, true);
  });

  test('validates items with an items schema', () => {
    const schema = {
      emails: {
        required: true,
        type: 'array',
        items: { type: 'string', email: true },
      },
    };
    const result = validate({ emails: ['alice@example.com', 'not-an-email'] }, schema);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === 'emails.1'));
  });

  test('items errors report correct indexed path', () => {
    const schema = {
      scores: {
        type: 'array',
        items: { type: 'number', min: 0, max: 100 },
      },
    };
    const result = validate({ scores: [50, 150, -5] }, schema);
    assert.equal(result.valid, false);
    const fields = result.errors.map((e) => e.field);
    assert.ok(fields.includes('scores.1'));
    assert.ok(fields.includes('scores.2'));
  });

  test('empty array fails minItems: 1', () => {
    const schema = { items: { type: 'array', minItems: 1 } };
    assert.equal(validate({ items: [] }, schema).valid, false);
  });

  test('uses custom message', () => {
    const schema = { tags: { type: 'array', minItems: 2, message: 'Need at least 2 tags' } };
    const result = validate({ tags: ['a'] }, schema);
    assert.equal(result.errors[0].message, 'Need at least 2 tags');
  });

  test('all items valid passes', () => {
    const schema = {
      scores: { type: 'array', items: { type: 'number', min: 0, max: 100 } },
    };
    assert.equal(validate({ scores: [0, 50, 100] }, schema).valid, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature 3: Strict Mode
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – strict mode', () => {
  const schema = { name: { required: true } };

  test('passes when no extra fields are present', () => {
    const result = validate({ name: 'Alice' }, schema, { strict: true });
    assert.equal(result.valid, true);
  });

  test('fails when an extra field is present', () => {
    const result = validate({ name: 'Alice', extra: 'oops' }, schema, { strict: true });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === 'extra'));
  });

  test('error message mentions the unexpected field', () => {
    const result = validate({ name: 'Alice', foo: 'bar' }, schema, { strict: true });
    assert.ok(result.errors[0].message.includes('foo'));
  });

  test('reports multiple unexpected fields', () => {
    const result = validate({ name: 'Alice', a: 1, b: 2 }, schema, { strict: true });
    const fields = result.errors.map((e) => e.field);
    assert.ok(fields.includes('a'));
    assert.ok(fields.includes('b'));
  });

  test('does not fail without strict option (default)', () => {
    const result = validate({ name: 'Alice', extra: 'ignored' }, schema);
    assert.equal(result.valid, true);
  });

  test('reports nested unexpected fields with dotted paths', () => {
    const s = {
      address: {
        required: true,
        schema: { city: { required: true } },
      },
    };
    const result = validate(
      { address: { city: 'Mumbai', country: 'IN' } },
      s,
      { strict: true }
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === 'address.country'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature 4: combineSchemas
// ─────────────────────────────────────────────────────────────────────────────

describe('combineSchemas()', () => {
  const base = { name: { required: true, minLength: 3 } };
  const emailPart = { email: { required: true, email: true } };

  test('combines two schemas into one', () => {
    const combined = combineSchemas(base, emailPart);
    assert.ok('name' in combined);
    assert.ok('email' in combined);
  });

  test('combined schema validates correctly', () => {
    const combined = combineSchemas(base, emailPart);
    assert.equal(validate({ name: 'Alice', email: 'alice@example.com' }, combined).valid, true);
    assert.equal(validate({ name: 'Al', email: 'alice@example.com' }, combined).valid, false);
  });

  test('later schema wins on duplicate keys', () => {
    const a = { name: { required: true, minLength: 5 } };
    const b = { name: { required: true, minLength: 2 } };
    const combined = combineSchemas(a, b);
    assert.equal(validate({ name: 'Al' }, combined).valid, true);
  });

  test('does not mutate original schemas', () => {
    const a = { name: { required: true } };
    const b = { email: { required: true, email: true } };
    combineSchemas(a, b);
    assert.ok(!('email' in a));
    assert.ok(!('name' in b));
  });

  test('combines three or more schemas', () => {
    const c = { age: { required: true, type: 'number' } };
    const combined = combineSchemas(base, emailPart, c);
    assert.ok('name' in combined && 'email' in combined && 'age' in combined);
  });

  test('ignores non-object arguments gracefully', () => {
    const combined = combineSchemas(base, null, emailPart);
    assert.ok('name' in combined);
    assert.ok('email' in combined);
  });

  test('returns empty object when called with no arguments', () => {
    assert.deepEqual(combineSchemas(), {});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature 5: Conditional Validation (requiredIf)
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – requiredIf', () => {
  const schema = {
    accountType: { required: true },
    companyName: {
      requiredIf: { field: 'accountType', equals: 'business' },
      message: 'Company name is required for business accounts',
    },
  };

  test('companyName is not required when accountType is personal', () => {
    const result = validate({ accountType: 'personal' }, schema);
    assert.equal(result.valid, true);
  });

  test('companyName is required when accountType is business', () => {
    const result = validate({ accountType: 'business' }, schema);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === 'companyName'));
  });

  test('passes when condition is met and field is present', () => {
    const result = validate({ accountType: 'business', companyName: 'Acme Ltd' }, schema);
    assert.equal(result.valid, true);
  });

  test('uses custom error message from rule.message', () => {
    const result = validate({ accountType: 'business' }, schema);
    assert.ok(result.errors[0].message.includes('business accounts'));
  });

  test('uses custom error message from requiredIf.message', () => {
    const s = {
      type: { required: true },
      field: { requiredIf: { field: 'type', equals: 'x', message: 'Field X is required' } },
    };
    const result = validate({ type: 'x' }, s);
    assert.equal(result.errors[0].message, 'Field X is required');
  });

  test('skips validation when requiredIf is not an object', () => {
    const s = { field: { requiredIf: 'invalid' } };
    const result = validate({ field: undefined }, s);
    assert.equal(result.valid, true);
  });

  test('skips validation when field key is missing', () => {
    const s = { field: { requiredIf: { equals: 'x' } } };
    const result = validate({ field: undefined }, s);
    assert.equal(result.valid, true);
  });

  test('empty-string value triggers requiredIf error', () => {
    const result = validate({ accountType: 'business', companyName: '' }, schema);
    assert.equal(result.valid, false);
  });

  test('null value triggers requiredIf error', () => {
    const result = validate({ accountType: 'business', companyName: null }, schema);
    assert.equal(result.valid, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature 6: Date Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – date', () => {
  test('passes for a valid date string', () => {
    const schema = { dob: { type: 'date' } };
    assert.equal(validate({ dob: '2000-01-01' }, schema).valid, true);
  });

  test('passes for a Date object', () => {
    const schema = { dob: { type: 'date' } };
    assert.equal(validate({ dob: new Date('2000-01-01') }, schema).valid, true);
  });

  test('fails for an invalid date string', () => {
    const schema = { dob: { type: 'date' } };
    const result = validate({ dob: 'not-a-date' }, schema);
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].field, 'dob');
  });

  test('fails for a non-string non-date value', () => {
    const schema = { dob: { type: 'date' } };
    const result = validate({ dob: true }, schema);
    assert.equal(result.valid, false);
  });

  test('skips date check when value is absent and not required', () => {
    const schema = { dob: { type: 'date' } };
    assert.equal(validate({}, schema).valid, true);
  });

  test('fails when date is before minDate', () => {
    const schema = { dob: { type: 'date', minDate: '2000-01-01' } };
    const result = validate({ dob: '1990-01-01' }, schema);
    assert.equal(result.valid, false);
  });

  test('fails when date is after maxDate', () => {
    const schema = { dob: { type: 'date', maxDate: '2020-01-01' } };
    const result = validate({ dob: '2025-01-01' }, schema);
    assert.equal(result.valid, false);
  });

  test('passes when date is within minDate and maxDate range', () => {
    const schema = { dob: { type: 'date', minDate: '2000-01-01', maxDate: '2020-01-01' } };
    assert.equal(validate({ dob: '2010-06-15' }, schema).valid, true);
  });

  test('passes at exactly minDate boundary', () => {
    const schema = { dob: { type: 'date', minDate: '2000-01-01' } };
    assert.equal(validate({ dob: '2000-01-01' }, schema).valid, true);
  });

  test('passes at exactly maxDate boundary', () => {
    const schema = { dob: { type: 'date', maxDate: '2020-01-01' } };
    assert.equal(validate({ dob: '2020-01-01' }, schema).valid, true);
  });

  test('uses custom error message', () => {
    const schema = { dob: { type: 'date', message: 'Bad date' } };
    const result = validate({ dob: 'invalid' }, schema);
    assert.equal(result.errors[0].message, 'Bad date');
  });

  test('activates on minDate alone without type: "date"', () => {
    const schema = { event: { minDate: '2024-01-01' } };
    const result = validate({ event: '2023-01-01' }, schema);
    assert.equal(result.valid, false);
  });
});

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { isStrongPassword } = require('../src/validators/password');
const { validate } = require('../src/validate');

// ─────────────────────────────────────────────────────────────────────────────
// isStrongPassword()
// ─────────────────────────────────────────────────────────────────────────────

describe('isStrongPassword()', () => {
  test('returns valid:true for a strong password meeting all criteria', () => {
    const result = isStrongPassword('Secure@123', {
      minLength: 8,
      uppercase: true,
      lowercase: true,
      number: true,
      specialChar: true,
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  test('returns valid:false when password is too short', () => {
    const result = isStrongPassword('Ab1!', { minLength: 8 });
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  test('returns valid:false when uppercase is missing', () => {
    const result = isStrongPassword('password123!', { uppercase: true });
    assert.equal(result.valid, false);
  });

  test('returns valid:false when lowercase is missing', () => {
    const result = isStrongPassword('PASSWORD123!', { lowercase: true });
    assert.equal(result.valid, false);
  });

  test('returns valid:false when number is missing', () => {
    const result = isStrongPassword('Password!', { number: true });
    assert.equal(result.valid, false);
  });

  test('returns valid:false when special char is missing', () => {
    const result = isStrongPassword('Password123', { specialChar: true });
    assert.equal(result.valid, false);
  });

  test('uses default minLength of 8 when not specified', () => {
    const short = isStrongPassword('Ab1!');
    assert.equal(short.valid, false);

    const long = isStrongPassword('Ab1!Ab1!');
    assert.equal(long.valid, true);
  });

  test('returns multiple errors when multiple criteria fail', () => {
    const result = isStrongPassword('abc', {
      minLength: 8,
      uppercase: true,
      number: true,
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 3);
  });

  test('returns error when password is not a string', () => {
    const result = isStrongPassword(12345);
    assert.equal(result.valid, false);
  });

  test('passes with an empty options object (only minLength:8 enforced)', () => {
    const result = isStrongPassword('longpassword');
    assert.equal(result.valid, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Password inside validate()
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – password rule', () => {
  test('passes for a strong password', () => {
    const schema = {
      password: { required: true, minLength: 8, uppercase: true, number: true, specialChar: true },
    };
    const result = validate({ password: 'Secure@123' }, schema);
    assert.equal(result.valid, true);
  });

  test('fails when password is too short', () => {
    const schema = { password: { minLength: 8 } };
    const result = validate({ password: 'abc' }, schema);
    assert.equal(result.valid, false);
  });

  test('fails when uppercase is required but missing', () => {
    const schema = { password: { uppercase: true } };
    const result = validate({ password: 'allowercase1!' }, schema);
    assert.equal(result.valid, false);
  });

  test('fails when specialChar is required but missing', () => {
    const schema = { password: { specialChar: true } };
    const result = validate({ password: 'Password123' }, schema);
    assert.equal(result.valid, false);
  });

  test('reports errors under the correct field name', () => {
    const schema = { pwd: { minLength: 10 } };
    const result = validate({ pwd: 'short' }, schema);
    assert.ok(result.errors.some((e) => e.field === 'pwd'));
  });

  test('uses custom message when provided', () => {
    const schema = { password: { minLength: 10, message: 'Too weak' } };
    const result = validate({ password: 'abc' }, schema);
    assert.equal(result.errors[0].message, 'Too weak');
  });
});

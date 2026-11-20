'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { isValidEmail } = require('../src/validators/email');
const { validate } = require('../src/validate');

describe('isValidEmail()', () => {
  // ── Valid addresses ──────────────────────────────────────────────────────

  test('accepts a standard email address', () => {
    assert.equal(isValidEmail('user@example.com'), true);
  });

  test('accepts an email with subdomain', () => {
    assert.equal(isValidEmail('user@mail.example.com'), true);
  });

  test('accepts an email with plus tag', () => {
    assert.equal(isValidEmail('user+tag@example.com'), true);
  });

  test('accepts an email with dots in local part', () => {
    assert.equal(isValidEmail('first.last@example.org'), true);
  });

  test('accepts an email with hyphenated domain', () => {
    assert.equal(isValidEmail('user@my-domain.co'), true);
  });

  test('accepts an email with uppercase letters', () => {
    assert.equal(isValidEmail('User@Example.COM'), true);
  });

  // ── Invalid addresses ────────────────────────────────────────────────────

  test('rejects a plain string without @', () => {
    assert.equal(isValidEmail('notanemail'), false);
  });

  test('rejects string missing domain', () => {
    assert.equal(isValidEmail('user@'), false);
  });

  test('rejects string missing local part', () => {
    assert.equal(isValidEmail('@example.com'), false);
  });

  test('rejects string without TLD', () => {
    assert.equal(isValidEmail('user@example'), false);
  });

  test('rejects string with spaces', () => {
    assert.equal(isValidEmail('user @example.com'), false);
  });

  test('rejects an empty string', () => {
    assert.equal(isValidEmail(''), false);
  });

  test('rejects null', () => {
    assert.equal(isValidEmail(null), false);
  });

  test('rejects undefined', () => {
    assert.equal(isValidEmail(undefined), false);
  });

  test('rejects a number', () => {
    assert.equal(isValidEmail(42), false);
  });

  test('rejects double @ symbol', () => {
    assert.equal(isValidEmail('user@@example.com'), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Email inside validate()
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() – email rule', () => {
  const schema = { email: { required: true, email: true } };

  test('passes for a valid email', () => {
    const result = validate({ email: 'alice@example.com' }, schema);
    assert.equal(result.valid, true);
  });

  test('fails for an invalid email format', () => {
    const result = validate({ email: 'not-an-email' }, schema);
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].field, 'email');
  });

  test('fails when email is missing (required)', () => {
    const result = validate({}, schema);
    assert.equal(result.valid, false);
  });

  test('fails when email is an empty string', () => {
    const result = validate({ email: '' }, schema);
    assert.equal(result.valid, false);
  });

  test('uses custom error message', () => {
    const s = { email: { email: true, message: 'Bad email!' } };
    const result = validate({ email: 'bad' }, s);
    assert.equal(result.errors[0].message, 'Bad email!');
  });
});

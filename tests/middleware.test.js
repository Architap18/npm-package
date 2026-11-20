'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { validateRequest } = require('../src/middleware');

// ─────────────────────────────────────────────────────────────────────────────
// Mock req / res / next helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeReq(body) {
  return { body };
}

function makeRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(data) {
      this._body = data;
      return this;
    },
  };
  return res;
}

function makeNext() {
  let called = false;
  const fn = () => { called = true; };
  fn.wasCalled = () => called;
  return fn;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('validateRequest() middleware', () => {
  const schema = {
    name: { required: true, minLength: 2 },
    email: { required: true, email: true },
    password: { required: true, minLength: 8 },
  };

  test('calls next() when all fields are valid', () => {
    const middleware = validateRequest(schema);
    const req = makeReq({ name: 'Alice', email: 'alice@example.com', password: 'Secret123' });
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);

    assert.equal(next.wasCalled(), true);
    assert.equal(res._status, null);
    assert.equal(res._body, null);
  });

  test('returns HTTP 400 when a required field is missing', () => {
    const middleware = validateRequest(schema);
    const req = makeReq({ email: 'alice@example.com', password: 'Secret123' }); // name missing
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);

    assert.equal(next.wasCalled(), false);
    assert.equal(res._status, 400);
    assert.equal(res._body.valid, false);
    assert.ok(res._body.errors.some((e) => e.field === 'name'));
  });

  test('returns HTTP 400 for invalid email', () => {
    const middleware = validateRequest(schema);
    const req = makeReq({ name: 'Alice', email: 'not-valid', password: 'Secret123' });
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);

    assert.equal(res._status, 400);
    assert.ok(res._body.errors.some((e) => e.field === 'email'));
  });

  test('returns HTTP 400 when password is too short', () => {
    const middleware = validateRequest(schema);
    const req = makeReq({ name: 'Alice', email: 'alice@example.com', password: 'abc' });
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);

    assert.equal(res._status, 400);
    assert.ok(res._body.errors.some((e) => e.field === 'password'));
  });

  test('returns structured JSON error body', () => {
    const middleware = validateRequest(schema);
    const req = makeReq({});
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);

    assert.equal(res._status, 400);
    assert.equal(typeof res._body, 'object');
    assert.equal(res._body.valid, false);
    assert.ok(Array.isArray(res._body.errors));
    assert.ok(res._body.errors.length > 0);
    assert.ok(res._body.errors.every((e) => e.field && e.message));
  });

  test('handles missing req.body gracefully', () => {
    const middleware = validateRequest(schema);
    const req = makeReq(undefined);
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);

    assert.equal(next.wasCalled(), false);
    assert.equal(res._status, 400);
  });

  test('handles req.body as array gracefully', () => {
    const middleware = validateRequest(schema);
    const req = makeReq([{ name: 'Alice' }]);
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);

    // Should treat it as empty object; required fields will fail.
    assert.equal(next.wasCalled(), false);
    assert.equal(res._status, 400);
  });

  test('collects errors from multiple failing fields', () => {
    const middleware = validateRequest(schema);
    const req = makeReq({ name: 'A', email: 'bad', password: 'short' });
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);

    assert.equal(res._status, 400);
    const fields = res._body.errors.map((e) => e.field);
    // name too short, email invalid, password too short
    assert.ok(fields.includes('name'));
    assert.ok(fields.includes('email'));
    assert.ok(fields.includes('password'));
  });

  test('returns valid:true result structure on success', () => {
    const s = { title: { required: true } };
    const middleware = validateRequest(s);
    const req = makeReq({ title: 'Hello World' });
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);

    assert.equal(next.wasCalled(), true);
    // On success, next() is called; response should not be touched.
    assert.equal(res._status, null);
  });

  test('never exposes stack traces on internal errors', () => {
    // Force an internal error by passing a schema that triggers a throw in
    // the middleware try/catch by corrupting res after the fact.
    const badSchema = {}; // valid, so next() will be called
    const middleware = validateRequest(badSchema);

    // Manufacture a req.body getter that throws.
    const req = {
      get body() { throw new Error('Unexpected internal error'); },
    };
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);

    assert.equal(res._status, 400);
    assert.equal(res._body.valid, false);
    // No stack trace in the response body.
    const bodyStr = JSON.stringify(res._body);
    assert.ok(!bodyStr.includes('Error'));
    assert.ok(!bodyStr.includes('stack'));
  });
});

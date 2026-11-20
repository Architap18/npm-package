'use strict';

/**
 * basic.js – Demonstrates all major validify-kit features.
 *
 * Run:  node examples/basic.js
 */

const { validate, isValidEmail, isStrongPassword } = require('../src/index');

// ─── 1. Full registration schema ─────────────────────────────────────────────

console.log('─── Example 1: Valid user data ───');
const registrationSchema = {
  name:     { required: true, minLength: 3, maxLength: 30 },
  email:    { required: true, email: true },
  password: { required: true, minLength: 8, uppercase: true, number: true, specialChar: true },
  age:      { required: true, type: 'number', min: 18, max: 100 },
};

console.log(validate(
  { name: 'Alice Smith', email: 'alice@example.com', password: 'Secure@123', age: 25 },
  registrationSchema
));

// ─── 2. Multiple failures ─────────────────────────────────────────────────────

console.log('\n─── Example 2: Multiple validation failures ───');
console.log(JSON.stringify(validate(
  { name: 'Al', email: 'not-an-email', password: 'weak', age: 15 },
  registrationSchema
), null, 2));

// ─── 3. Pattern validation ────────────────────────────────────────────────────

console.log('\n─── Example 3: Pattern (Indian mobile number) ───');
const mobileSchema = {
  mobile: { required: true, pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit Indian mobile number' },
};
console.log(validate({ mobile: '9876543210' }, mobileSchema)); // valid
console.log(validate({ mobile: '12345' }, mobileSchema));      // invalid

// ─── 4. Enum validation ───────────────────────────────────────────────────────

console.log('\n─── Example 4: Enum ───');
const roleSchema = { role: { required: true, enum: ['admin', 'user', 'moderator'] } };
console.log(validate({ role: 'admin' }, roleSchema));      // valid
console.log(validate({ role: 'superuser' }, roleSchema));  // invalid

// ─── 5. Cross-field validation ────────────────────────────────────────────────

console.log('\n─── Example 5: matchesField (confirmPassword) ───');
const passwordSchema = {
  password:        { required: true, minLength: 8 },
  confirmPassword: { required: true, matchesField: 'password', message: 'Passwords do not match' },
};
console.log(validate({ password: 'Secret123', confirmPassword: 'Secret123' }, passwordSchema)); // valid
console.log(validate({ password: 'Secret123', confirmPassword: 'Other456' }, passwordSchema));  // invalid

// ─── 6. Nested object validation ─────────────────────────────────────────────

console.log('\n─── Example 6: Nested object ───');
const userSchema = {
  name:    { required: true },
  address: {
    required: true,
    schema: {
      city: { required: true, minLength: 2 },
      zip:  { required: true, pattern: /^\d{6}$/, message: 'zip must be a valid 6-digit code' },
    },
  },
};
console.log(validate(
  { name: 'Alice', address: { city: 'Mumbai', zip: '400001' } },
  userSchema
)); // valid
console.log(JSON.stringify(validate(
  { name: 'Alice', address: { city: 'A', zip: 'BAD' } },
  userSchema
), null, 2)); // dotted field paths in errors

// ─── 7. abortEarly ────────────────────────────────────────────────────────────

console.log('\n─── Example 7: abortEarly ───');
const schema7 = {
  name:  { required: true },
  email: { required: true, email: true },
  age:   { required: true, type: 'number', min: 18 },
};
console.log('All errors:',   validate({}, schema7).errors.length, 'error(s)');
console.log('abortEarly:',   validate({}, schema7, { abortEarly: true }).errors.length, 'error(s)');

// ─── 8. Standalone helpers ────────────────────────────────────────────────────

console.log('\n─── Example 8: isValidEmail() ───');
console.log('alice@example.com :', isValidEmail('alice@example.com')); // true
console.log('not-an-email      :', isValidEmail('not-an-email'));       // false

console.log('\n─── Example 9: isStrongPassword() ───');
console.log(isStrongPassword('Secure@123', { minLength: 8, uppercase: true, lowercase: true, number: true, specialChar: true }));
console.log(isStrongPassword('weakpass', { uppercase: true, number: true }));

// ─── 9. Custom validator ──────────────────────────────────────────────────────

console.log('\n─── Example 10: Custom validator ───');
const customSchema = {
  username: {
    required: true,
    custom: (value) => /^[a-z0-9_]{3,}$/.test(value),
    message: 'Username must be lowercase alphanumeric and at least 3 characters',
  },
};
console.log(validate({ username: 'alice_01' }, customSchema)); // valid
console.log(validate({ username: 'Al' }, customSchema));       // invalid

'use strict';

/**
 * express-example.js – Demonstrates validateRequest() middleware with Express.
 *
 * Prerequisites:
 *   npm install express
 *
 * Run:
 *   node examples/express-example.js
 *
 * Then test with:
 *   curl -s -X POST http://localhost:3000/register \
 *     -H "Content-Type: application/json" \
 *     -d '{"name":"Alice","email":"alice@example.com","password":"Secure@123"}' | jq
 *
 *   curl -s -X POST http://localhost:3000/register \
 *     -H "Content-Type: application/json" \
 *     -d '{"name":"A","email":"bad","password":"weak"}' | jq
 */

let express;
try {
  express = require('express');
} catch {
  console.error(
    'Express is not installed.\n' +
    'Run:  npm install express\n' +
    'Then re-run this example.'
  );
  process.exit(1);
}

const { validateRequest } = require('../src/index');

const app = express();
app.use(express.json());

// ─── Registration schema ────────────────────────────────────────────────────

const registerSchema = {
  name: { required: true, minLength: 2, maxLength: 50 },
  email: { required: true, email: true },
  password: {
    required: true,
    minLength: 8,
    uppercase: true,
    number: true,
  },
};

// ─── Route ──────────────────────────────────────────────────────────────────

app.post('/register', validateRequest(registerSchema), (req, res) => {
  // This handler is only reached when validation passes.
  res.json({
    message: 'Registration successful',
    user: { name: req.body.name, email: req.body.email },
  });
});

// ─── Another route: profile update ──────────────────────────────────────────

const profileSchema = {
  bio: { maxLength: 200 },
  website: { type: 'string' },
  age: { type: 'number', min: 13, max: 120 },
};

app.put('/profile', validateRequest(profileSchema), (req, res) => {
  res.json({ message: 'Profile updated', data: req.body });
});

// ─── Start server ────────────────────────────────────────────────────────────

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n  validify-kit Express example running at http://localhost:${PORT}`);
  console.log('  POST /register   – registration with validation');
  console.log('  PUT  /profile    – profile update with optional fields\n');
});

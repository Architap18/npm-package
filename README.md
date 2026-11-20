# Validify Kit

**A lightweight, schema-driven validation toolkit for Node.js and Express applications.**

Validate incoming data using reusable schemas instead of writing repetitive validation logic for every API endpoint.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen)]()

---

## Table of Contents

- [Overview](#overview)
- [Why Validify Kit?](#why-validify-kit)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Schema Definition](#schema-definition)
- [API Reference](#api-reference)
- [Validation Rules](#validation-rules)
- [Express Middleware](#express-middleware)
- [Advanced Validation](#advanced-validation)
- [Error Response Format](#error-response-format)
- [Testing](#testing)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Validify Kit is a reusable JavaScript validation library designed to simplify request validation in Node.js applications.

Developers frequently write the same validation logic for registration forms, login endpoints, profile updates and other API requests.

Validify Kit provides a schema-driven approach that makes validation easier to maintain, reuse and understand.

### The Problem

Without a validation library, developers repeatedly write code like:

```javascript
if (!req.body.email) {
  return res.status(400).json({
    error: "Email is required"
  });
}

if (!req.body.email.includes("@")) {
  return res.status(400).json({
    error: "Invalid email"
  });
}

if (req.body.password.length < 8) {
  return res.status(400).json({
    error: "Password must contain at least 8 characters"
  });
}
```

This creates repetitive code across multiple API endpoints.

### The Solution

With Validify Kit, define validation rules once and reuse them:

```javascript
const { validate } = require("validify-kit");

const schema = {
  name: {
    required: true,
    minLength: 3
  },
  email: {
    required: true,
    email: true
  },
  password: {
    required: true,
    minLength: 8
  }
};

const result = validate(req.body, schema);
```

Validify automatically checks the input and returns structured validation errors.

---

## Why Validify Kit?

- **Simple:** Define validation rules using easy-to-understand schemas.
- **Reusable:** Use the same validation logic across different applications.
- **Lightweight:** No runtime dependencies.
- **Express-ready:** Integrate validation directly into Express routes.
- **Flexible:** Combine multiple validation rules for individual fields.
- **Customizable:** Define custom validation functions and error messages.
- **Nested validation:** Validate deeply nested objects.
- **Safe:** Handles invalid custom validators without crashing the application.

---

## Features

| Feature | Description |
|---|---|
| Required fields | Checks missing, null and empty values |
| Email validation | Validates email formats |
| Password validation | Checks password strength |
| String validation | Minimum and maximum length |
| Number validation | Type and numeric range checks |
| Pattern validation | Regular expression validation |
| Enum validation | Restricts values to predefined options |
| Optional fields | Skips validation when fields are absent |
| Cross-field validation | Compares values between fields |
| Nested validation | Validates nested objects recursively |
| Custom validation | Supports user-defined validation functions |
| Error handling | Returns structured validation errors |
| abortEarly | Stops after the first error when enabled |
| Express middleware | Integrates validation into Express routes |

---

## Installation

Install the package using NPM:

```bash
npm install validify-kit
```

**Requirements:**
- Node.js 18 or higher.
- Works with CommonJS-based Node.js applications.
- No additional runtime dependencies required.

---

## Quick Start

Import the required functions:

```javascript
const {
  validate,
  validateRequest,
  isValidEmail,
  isStrongPassword
} = require("validify-kit");
```

### 1. Define a schema

```javascript
const schema = {
  name: {
    required: true,
    minLength: 3
  },

  email: {
    required: true,
    email: true
  },

  password: {
    required: true,
    minLength: 8
  }
};
```

### 2. Validate input data

```javascript
const userData = {
  name: "Alice",
  email: "alice@example.com",
  password: "Secure123"
};

const result = validate(userData, schema);

console.log(result);
```

Output:

```javascript
{
  valid: true,
  errors: []
}
```

### 3. Handle invalid input

```javascript
const userData = {
  name: "Al",
  email: "invalid-email",
  password: "123"
};

const result = validate(userData, schema);

console.log(result);
```

Output:

```javascript
{
  valid: false,
  errors: [
    {
      field: "name",
      message: "name must be at least 3 characters long"
    },
    {
      field: "email",
      message: "email must be a valid email address"
    },
    {
      field: "password",
      message: "password must be at least 8 characters long"
    }
  ]
}
```

---

## Schema Definition

A schema is a JavaScript object where:

- Each key represents a field name.
- Each value contains the validation rules for that field.

Example:

```javascript
const schema = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 30
  },

  email: {
    required: true,
    email: true
  },

  password: {
    required: true,
    minLength: 8,
    uppercase: true,
    lowercase: true,
    number: true,
    specialChar: true
  },

  age: {
    required: true,
    type: "number",
    min: 18,
    max: 100
  },

  role: {
    required: true,
    enum: ["admin", "user", "moderator"]
  }
};
```

Multiple validation rules can be applied to the same field.

Fields that are not defined in the schema are ignored.

Validify does not modify the original input object.

---

## API Reference

### 1. `validate(data, schema, options)`

Validates an object against a given schema.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| data | Object | Input data to validate |
| schema | Object | Validation schema |
| options | Object | Optional configuration |

**Available options**

| Option | Type | Default | Description |
|---|---|---|---|
| abortEarly | Boolean | false | Stops validation after the first error |

**Example**

```javascript
const result = validate(userData, schema);
```

To stop after the first validation error:

```javascript
const result = validate(
  userData,
  schema,
  { abortEarly: true }
);
```

**Returns**

```javascript
{
  valid: true,
  errors: []
}
```

Or:

```javascript
{
  valid: false,
  errors: [
    {
      field: "email",
      message: "Invalid email"
    }
  ]
}
```

### 2. `validateRequest(schema, options)`

Creates Express-compatible validation middleware.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| schema | Object | Validation schema |
| options | Object | Optional validation configuration |

**Returns:** Express middleware function.

The middleware:

- Validates `req.body`.
- Calls `next()` when validation succeeds.
- Returns HTTP 400 when validation fails.
- Sends structured JSON errors.
- Does not expose internal stack traces to clients.

Example:

```javascript
app.post(
  "/register",
  validateRequest(schema),
  registerController
);
```

### 3. `isValidEmail(email)`

Standalone email validation helper.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| email | Any | Value to validate |

**Returns:** Boolean.

```javascript
isValidEmail("user@example.com"); // true
isValidEmail("invalid-email");    // false
isValidEmail(null);               // false
```

### 4. `isStrongPassword(password, options)`

Standalone password strength checker.

**Parameters**

| Parameter | Type | Default |
|---|---|---|
| password | String | — |
| minLength | Number | 8 |
| uppercase | Boolean | false |
| lowercase | Boolean | false |
| number | Boolean | false |
| specialChar | Boolean | false |

Example:

```javascript
const result = isStrongPassword("Secure@123", {
  minLength: 8,
  uppercase: true,
  lowercase: true,
  number: true,
  specialChar: true
});

console.log(result);
```

Returns:

```javascript
{
  valid: true,
  errors: []
}
```

---

## Validation Rules

The following rules are supported by Validify Kit.

| Rule | Type | Description |
|---|---|---|
| required | Boolean | Field must be present and non-empty |
| email | Boolean | Validates email format |
| type | String | Validates string or number type |
| minLength | Number | Minimum string length |
| maxLength | Number | Maximum string length |
| uppercase | Boolean | Requires an uppercase letter |
| lowercase | Boolean | Requires a lowercase letter |
| number | Boolean | Requires a numeric digit |
| specialChar | Boolean | Requires a special character |
| min | Number | Minimum numeric value |
| max | Number | Maximum numeric value |
| pattern | RegExp | Matches a regular expression |
| enum | Array | Restricts values to allowed options |
| matchesField | String | Compares against another field |
| schema | Object | Defines a nested validation schema |
| custom | Function | Executes a custom validation function |
| message | String | Custom validation error message |

**Important behavior:**

- Fields without `required: true` are optional.
- Missing optional fields are skipped.
- When a required field fails validation, further rules for that field are skipped.
- All validation errors are collected by default.
- Set `abortEarly: true` to stop after the first error.

---

## Express Middleware

Validify Kit integrates directly with Express applications.

### Example: User Registration API

```javascript
const express = require("express");

const {
  validateRequest
} = require("validify-kit");

const app = express();

app.use(express.json());

const registerSchema = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 50
  },

  email: {
    required: true,
    email: true
  },

  password: {
    required: true,
    minLength: 8,
    uppercase: true,
    number: true,
    specialChar: true
  },

  confirmPassword: {
    required: true,
    matchesField: "password",
    message: "Passwords do not match"
  }
};

app.post(
  "/register",
  validateRequest(registerSchema),
  (req, res) => {
    res.status(201).json({
      message: "Registration successful"
    });
  }
);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

### Using abortEarly

```javascript
app.post(
  "/register",
  validateRequest(registerSchema, {
    abortEarly: true
  }),
  registerController
);
```

---

## Advanced Validation

### 1. Pattern Validation

Use regular expressions to validate specific formats.

Example: Indian mobile number.

```javascript
const schema = {
  mobile: {
    required: true,
    pattern: /^[6-9]\d{9}$/,
    message: "Enter a valid 10-digit mobile number"
  }
};
```

Example: Postal code.

```javascript
const schema = {
  zip: {
    required: true,
    pattern: /^\d{6}$/,
    message: "Enter a valid 6-digit postal code"
  }
};
```

Pattern validation accepts JavaScript regular expressions.

### 2. Enum Validation

Restrict a field to a predefined set of values.

```javascript
const schema = {
  role: {
    required: true,
    enum: ["admin", "user", "moderator"]
  },

  status: {
    required: true,
    enum: ["active", "inactive"]
  }
};
```

Enum validation uses strict equality.

### 3. Optional Fields

Fields without `required: true` are implicitly optional.

```javascript
const schema = {
  name: {
    required: true
  },

  bio: {
    maxLength: 300
  },

  website: {
    type: "string"
  }
};
```

The `bio` and `website` fields are skipped when absent.

When provided, their validation rules are applied.

### 4. Cross-Field Validation

Use `matchesField` to compare one field with another.

This is particularly useful for password confirmation.

```javascript
const schema = {
  password: {
    required: true,
    minLength: 8
  },

  confirmPassword: {
    required: true,
    matchesField: "password",
    message: "Passwords do not match"
  }
};
```

Example:

```javascript
validate(
  {
    password: "Secure123",
    confirmPassword: "Secure123"
  },
  schema
);
```

Returns:

```javascript
{
  valid: true,
  errors: []
}
```

### 5. Nested Object Validation

Validify supports recursive validation of nested objects.

```javascript
const schema = {
  name: {
    required: true
  },

  address: {
    required: true,

    schema: {
      city: {
        required: true,
        minLength: 2
      },

      zip: {
        required: true,
        pattern: /^\d{6}$/
      },

      country: {
        required: true,
        enum: ["IN", "US", "GB"]
      }
    }
  }
};
```

Example input:

```javascript
const data = {
  name: "Alice",

  address: {
    city: "A",
    zip: "INVALID",
    country: "XX"
  }
};

const result = validate(data, schema);
```

Errors contain dotted field paths:

```javascript
{
  valid: false,
  errors: [
    {
      field: "address.city",
      message: "address.city must be at least 2 characters long"
    },
    {
      field: "address.zip",
      message: "Invalid zip"
    }
  ]
}
```

Nested validation can be used for objects containing multiple levels of nested data.

### 6. abortEarly

By default, Validify collects all validation errors.

Use `abortEarly: true` to stop after the first error.

```javascript
// Collect all errors
const result = validate(data, schema);

// Stop at the first error
const result = validate(
  data,
  schema,
  { abortEarly: true }
);
```

The same option is available in Express middleware.

### 7. Custom Validation

You can provide your own validation function.

Example: Username validation.

```javascript
const schema = {
  username: {
    required: true,

    custom: (value) => {
      return /^[a-z0-9_]{3,}$/.test(value);
    },

    message: "Username must be lowercase and at least 3 characters"
  }
};
```

The custom validator should return `true` for valid input.

A failed or throwing custom validator is handled as a validation error rather than crashing the application.

---

## Error Response Format

Validify maintains a consistent response structure.

**Successful validation**

```json
{
  "valid": true,
  "errors": []
}
```

**Failed validation**

```json
{
  "valid": false,
  "errors": [
    {
      "field": "email",
      "message": "email must be a valid email address"
    },
    {
      "field": "password",
      "message": "password must be at least 8 characters long"
    }
  ]
}
```

When used through Express middleware, the same structure is returned with HTTP status code `400`.

---

## Testing

Validify Kit uses the built-in Node.js test runner.

No external testing framework is required.

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

The test suite covers:

- Required field validation
- Email validation
- Password strength validation
- String and number validation
- Pattern and enum validation
- Optional fields
- Cross-field validation
- Nested object validation
- Custom validation
- Express middleware
- Error handling and edge cases

---

## Limitations

- Email validation checks format only; it does not verify whether an email address exists.
- `matchesField` uses strict equality and does not perform deep object comparison.
- Custom validators are synchronous.
- Asynchronous validation is not currently supported.
- Unknown fields that are not defined in the schema are ignored.
- Validify Kit performs input validation, not database validation or authentication.

'use strict';

const { validate } = require('./validate');
const { validateRequest } = require('./middleware');
const { isValidEmail } = require('./validators/email');
const { isStrongPassword } = require('./validators/password');

module.exports = {
  validate,
  validateRequest,
  isValidEmail,
  isStrongPassword,
};

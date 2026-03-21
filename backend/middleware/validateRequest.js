const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return next(
    ApiError.badRequest('Validation failed', errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    })))
  );
};

module.exports = validateRequest;
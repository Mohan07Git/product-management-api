import { body, query, param, validationResult } from 'express-validator';
import { VALID_CATEGORIES, VALID_STATUSES } from '../constants.js';

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg);
    const error = new Error(errorMessages.join('; '));
    error.statusCode = 400;
    error.errors = errorMessages;
    return next(error);
  }
  next();
}

export const validateCreate = [
  body('name')
    .exists({ checkFalsy: true }).withMessage('name is required')
    .isString().withMessage('name must be a string')
    .trim()
    .notEmpty().withMessage('name cannot be empty'),

  body('sku')
    .exists({ checkFalsy: true }).withMessage('sku is required')
    .isString().withMessage('sku must be a string')
    .trim()
    .notEmpty().withMessage('sku cannot be empty'),

  body('description')
    .optional()
    .isString().withMessage('description must be a string'),

  body('category')
    .optional()
    .isIn(VALID_CATEGORIES).withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('price')
    .exists({ checkFalsy: true }).withMessage('price is required')
    .isFloat({ gt: 0 }).withMessage('price must be a positive number')
    .custom(value => {
      const str = value.toString();
      if (str.includes('.') && str.split('.')[1].length > 2) {
        throw new Error('price must have up to 2 decimal places');
      }
      return true;
    }),

  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('stock must be a non-negative integer'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  handleValidationErrors
];

export const validateUpdate = [
  param('id')
    .isUUID(4).withMessage('id must be a valid UUID v4'),

  body('name')
    .optional()
    .isString().withMessage('name must be a string')
    .trim()
    .notEmpty().withMessage('name cannot be empty'),

  body('sku')
    .optional()
    .isString().withMessage('sku must be a string')
    .trim()
    .notEmpty().withMessage('sku cannot be empty'),

  body('description')
    .optional()
    .isString().withMessage('description must be a string'),

  body('category')
    .optional()
    .isIn(VALID_CATEGORIES).withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('price')
    .optional()
    .isFloat({ gt: 0 }).withMessage('price must be a positive number')
    .custom(value => {
      const str = value.toString();
      if (str.includes('.') && str.split('.')[1].length > 2) {
        throw new Error('price must have up to 2 decimal places');
      }
      return true;
    }),

  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('stock must be a non-negative integer'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  handleValidationErrors
];

export const validateFilters = [
  query('category')
    .optional()
    .isIn(VALID_CATEGORIES).withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  query('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('minPrice must be a non-negative number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('maxPrice must be a non-negative number'),

  query('inStock')
    .optional()
    .isBoolean({ strict: false }).withMessage('inStock must be true or false'),

  query('search')
    .optional()
    .isString().withMessage('search must be a string'),

  handleValidationErrors
];

export const validateBulkCreate = [
  body()
    .isArray({ min: 1, max: 100 }).withMessage('Request body must be an array with 1 to 100 items'),

  body('*.name')
    .exists({ checkFalsy: true }).withMessage('name is required')
    .isString().withMessage('name must be a string')
    .trim()
    .notEmpty().withMessage('name cannot be empty'),

  body('*.sku')
    .exists({ checkFalsy: true }).withMessage('sku is required')
    .isString().withMessage('sku must be a string')
    .trim()
    .notEmpty().withMessage('sku cannot be empty'),

  body('*.description')
    .optional()
    .isString().withMessage('description must be a string'),

  body('*.category')
    .optional()
    .isIn(VALID_CATEGORIES).withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('*.price')
    .exists({ checkFalsy: true }).withMessage('price is required')
    .isFloat({ gt: 0 }).withMessage('price must be a positive number')
    .custom(value => {
      const str = value.toString();
      if (str.includes('.') && str.split('.')[1].length > 2) {
        throw new Error('price must have up to 2 decimal places');
      }
      return true;
    }),

  body('*.stock')
    .optional()
    .isInt({ min: 0 }).withMessage('stock must be a non-negative integer'),

  body('*.status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  handleValidationErrors
];
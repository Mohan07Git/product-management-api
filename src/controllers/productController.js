import { productModel } from '../models/product.js';
import { catchAsync } from '../middleware/catchAsync.js';

/**
 * Creates a standardized API response object.
 * @param {boolean} success - Whether the request succeeded
 * @param {*} [data=null] - Response payload on success
 * @param {*} [error=null] - Error message or details on failure
 * @returns {Object} Response object with success, optional data, optional error
 */
function createResponse(success, data = null, error = null) {
  const response = { success };
  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  return response;
}

/**
 * GET /products - Returns all non-archived products with optional filters.
 * @param {import("express").Request} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.category] - Filter by category (exact match)
 * @param {string} [req.query.status] - Filter by status (exact match)
 * @param {string} [req.query.minPrice] - Minimum price (inclusive)
 * @param {string} [req.query.maxPrice] - Maximum price (inclusive)
 * @param {string} [req.query.inStock] - 'true' for stock > 0, 'false' for stock === 0
 * @param {string} [req.query.search] - Case-insensitive substring match on name or description
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @throws {Error} Passed to next() for catchAsync to handle (validation errors from query parsing)
 * @status 200 - Success with array of products (empty if no matches)
 * @status 400 - Invalid query parameters (handled by validateFilters middleware)
 * @status 500 - Internal server error
 */
const getAll = async (req, res, next) => {
  const filters = {};
  if (req.query.category) filters.category = req.query.category;
  if (req.query.status) filters.status = req.query.status;
  if (req.query.minPrice) filters.minPrice = parseFloat(req.query.minPrice);
  if (req.query.maxPrice) filters.maxPrice = parseFloat(req.query.maxPrice);
  if (req.query.inStock !== undefined) filters.inStock = req.query.inStock === 'true';
  if (req.query.search) filters.search = req.query.search;

  const products = productModel.findAll(filters);
  res.json(createResponse(true, products));
};

/**
 * GET /products/:id - Returns a single product by UUID.
 * @param {import("express").Request} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Product UUID (v4)
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @throws {Error} Passed to next() for catchAsync to handle
 * @status 200 - Success with product object
 * @status 404 - Product not found or archived
 * @status 500 - Internal server error
 */
const getById = async (req, res, next) => {
  const product = productModel.findById(req.params.id);
  if (!product) {
    return res.status(404).json(createResponse(false, null, 'Product not found'));
  }
  res.json(createResponse(true, product));
};

/**
 * POST /products - Creates a new product.
 * @param {import("express").Request} req - Express request object
 * @param {Object} req.body - Product data (validated by validateCreate middleware)
 * @param {string} req.body.name - Product name (required)
 * @param {string} req.body.sku - Unique SKU (required)
 * @param {string} [req.body.description] - Optional description
 * @param {string} [req.body.category='other'] - Category
 * @param {number} req.body.price - Positive price (required)
 * @param {number} [req.body.stock=0] - Initial stock
 * @param {string} [req.body.status='active'] - Status
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @throws {Error} Passed to next() for catchAsync to handle (validation errors from model)
 * @status 201 - Created with new product object (includes generated id, createdAt, archivedAt=null)
 * @status 400 - Validation error (missing/invalid fields, duplicate SKU)
 * @status 500 - Internal server error
 */
const create = async (req, res, next) => {
  const product = productModel.create(req.body);
  res.status(201).json(createResponse(true, product));
};

/**
 * PATCH /products/:id - Partially updates a product.
 * @param {import("express").Request} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Product UUID (v4)
 * @param {Object} req.body - Fields to update (validated by validateUpdate middleware)
 * @param {string} [req.body.name] - New name
 * @param {string} [req.body.sku] - New SKU (must be unique if changed)
 * @param {string} [req.body.description] - New description
 * @param {string} [req.body.category] - New category
 * @param {number} [req.body.price] - New price
 * @param {number} [req.body.stock] - New stock
 * @param {string} [req.body.status] - New status
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @throws {Error} Passed to next() for catchAsync to handle (validation errors from model)
 * @status 200 - Success with updated product object (id and createdAt preserved)
 * @status 400 - Validation error (invalid fields, duplicate SKU)
 * @status 404 - Product not found or archived
 * @status 500 - Internal server error
 */
const update = async (req, res, next) => {
  const product = productModel.update(req.params.id, req.body);
  if (!product) {
    return res.status(404).json(createResponse(false, null, 'Product not found'));
  }
  res.json(createResponse(true, product));
};

/**
 * DELETE /products/:id - Soft-archives a product (sets archivedAt).
 * @param {import("express").Request} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Product UUID (v4)
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @throws {Error} Passed to next() for catchAsync to handle
 * @status 200 - Success with archive confirmation message
 * @status 404 - Product not found or already archived
 * @status 500 - Internal server error
 */
const deleteProduct = async (req, res, next) => {
  const deleted = productModel.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json(createResponse(false, null, 'Product not found'));
  }
  res.json(createResponse(true, { message: 'Product archived successfully' }));
};

/**
 * DELETE /products/:id/restore - Restores a soft-archived product.
 * @param {import("express").Request} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Product UUID (v4)
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @throws {Error} Passed to next() for catchAsync to handle
 * @status 200 - Success with restore confirmation message
 * @status 404 - Product not found or not archived
 * @status 500 - Internal server error
 */
const restore = async (req, res, next) => {
  const restored = productModel.restore(req.params.id);
  if (!restored) {
    return res.status(404).json(createResponse(false, null, 'Product not found or not archived'));
  }
  res.json(createResponse(true, { message: 'Product restored successfully' }));
};

/**
 * POST /products/bulk - Creates multiple products atomically.
 * @param {import("express").Request} req - Express request object
 * @param {Object[]} req.body - Array of product data (validated by validateBulkCreate middleware)
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @throws {Error} Passed to next() for catchAsync to handle (validation errors from model)
 * @status 201 - Created with array of new product objects
 * @status 400 - Validation error (invalid array, missing/invalid fields, duplicate SKUs)
 * @status 500 - Internal server error
 */
const bulkCreate = async (req, res, next) => {
  const products = productModel.bulkCreate(req.body);
  res.status(201).json(createResponse(true, products));
};

export const productController = {
  getAll: catchAsync(getAll),
  getById: catchAsync(getById),
  create: catchAsync(create),
  update: catchAsync(update),
  delete: catchAsync(deleteProduct),
  restore: catchAsync(restore),
  bulkCreate: catchAsync(bulkCreate)
};
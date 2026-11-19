import { productModel } from '../models/product.js';
import { catchAsync } from '../middleware/catchAsync.js';

function createResponse(success, data = null, error = null) {
  const response = { success };
  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  return response;
}

const getAll = async (req, res) => {
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

const getById = async (req, res) => {
  const product = productModel.findById(req.params.id);
  if (!product) {
    return res.status(404).json(createResponse(false, null, 'Product not found'));
  }
  res.json(createResponse(true, product));
};

const create = async (req, res) => {
  const product = productModel.create(req.body);
  res.status(201).json(createResponse(true, product));
};

const update = async (req, res) => {
  const product = productModel.update(req.params.id, req.body);
  if (!product) {
    return res.status(404).json(createResponse(false, null, 'Product not found'));
  }
  res.json(createResponse(true, product));
};

const deleteProduct = async (req, res) => {
  const deleted = productModel.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json(createResponse(false, null, 'Product not found'));
  }
  res.json(createResponse(true, { message: 'Product archived successfully' }));
};

const restore = async (req, res) => {
  const restored = productModel.restore(req.params.id);
  if (!restored) {
    return res.status(404).json(createResponse(false, null, 'Product not found or not archived'));
  }
  res.json(createResponse(true, { message: 'Product restored successfully' }));
};

export const productController = {
  getAll: catchAsync(getAll),
  getById: catchAsync(getById),
  create: catchAsync(create),
  update: catchAsync(update),
  delete: catchAsync(deleteProduct),
  restore: catchAsync(restore)
};
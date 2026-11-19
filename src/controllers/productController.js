import { productModel } from '../models/product.js';

function createResponse(success, data = null, error = null) {
  const response = { success };
  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  return response;
}

export const productController = {
  async getAll(req, res, next) {
    try {
      const filters = {};
      if (req.query.category) filters.category = req.query.category;
      if (req.query.status) filters.status = req.query.status;
      if (req.query.minPrice) filters.minPrice = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filters.maxPrice = parseFloat(req.query.maxPrice);
      if (req.query.inStock !== undefined) filters.inStock = req.query.inStock === 'true';

      const products = productModel.findAll(filters);
      res.json(createResponse(true, products));
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const product = productModel.findById(req.params.id);
      if (!product) {
        return res.status(404).json(createResponse(false, null, 'Product not found'));
      }
      res.json(createResponse(true, product));
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const product = productModel.create(req.body);
      res.status(201).json(createResponse(true, product));
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const product = productModel.update(req.params.id, req.body);
      if (!product) {
        return res.status(404).json(createResponse(false, null, 'Product not found'));
      }
      res.json(createResponse(true, product));
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const deleted = productModel.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json(createResponse(false, null, 'Product not found'));
      }
      res.json(createResponse(true, { message: 'Product deleted successfully' }));
    } catch (err) {
      next(err);
    }
  }
};
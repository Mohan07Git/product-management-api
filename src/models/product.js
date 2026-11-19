import { v4 as uuidv4 } from 'uuid';

const VALID_CATEGORIES = ['electronics', 'clothing', 'food', 'books', 'other'];
const VALID_STATUSES = ['active', 'inactive', 'discontinued'];

const products = new Map();
const skuIndex = new Map();

function validateProduct(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push('name is required and must be a non-empty string');
    }
    if (!data.sku || typeof data.sku !== 'string' || data.sku.trim() === '') {
      errors.push('sku is required and must be a non-empty string');
    }
  }

  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim() === '')) {
    errors.push('name must be a non-empty string');
  }

  if (data.sku !== undefined) {
    if (typeof data.sku !== 'string' || data.sku.trim() === '') {
      errors.push('sku must be a non-empty string');
    } else if (!isUpdate && skuIndex.has(data.sku)) {
      errors.push('sku must be unique');
    } else if (isUpdate && skuIndex.has(data.sku) && skuIndex.get(data.sku) !== data.id) {
      errors.push('sku must be unique');
    }
  }

  if (data.description !== undefined && data.description !== null && typeof data.description !== 'string') {
    errors.push('description must be a string');
  }

  if (data.category !== undefined) {
    if (!VALID_CATEGORIES.includes(data.category)) {
      errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
  }

  if (data.price !== undefined) {
    if (typeof data.price !== 'number' || data.price <= 0 || !Number.isFinite(data.price)) {
      errors.push('price must be a positive number');
    } else {
      const priceStr = data.price.toString();
      if (priceStr.includes('.') && priceStr.split('.')[1].length > 2) {
        errors.push('price must have up to 2 decimal places');
      }
    }
  }

  if (data.stock !== undefined) {
    if (!Number.isInteger(data.stock) || data.stock < 0) {
      errors.push('stock must be a non-negative integer');
    }
  }

  if (data.status !== undefined) {
    if (!VALID_STATUSES.includes(data.status)) {
      errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
  }

  return errors;
}

export const productModel = {
  findAll(filters = {}) {
    let result = Array.from(products.values());

    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }
    if (filters.status) {
      result = result.filter(p => p.status === filters.status);
    }
    if (filters.minPrice !== undefined) {
      result = result.filter(p => p.price >= filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      result = result.filter(p => p.price <= filters.maxPrice);
    }
    if (filters.inStock !== undefined) {
      result = result.filter(p => filters.inStock ? p.stock > 0 : p.stock === 0);
    }

    return result;
  },

  findById(id) {
    return products.get(id) || null;
  },

  findBySku(sku) {
    const id = skuIndex.get(sku);
    return id ? products.get(id) : null;
  },

  create(data) {
    const errors = validateProduct(data);
    if (errors.length > 0) {
      const error = new Error(errors.join('; '));
      error.statusCode = 400;
      error.errors = errors;
      throw error;
    }

    const now = new Date();
    const product = {
      id: uuidv4(),
      name: data.name.trim(),
      sku: data.sku.trim(),
      description: (data.description && data.description.trim()) || '',
      category: data.category || 'other',
      price: Number(data.price.toFixed(2)),
      stock: data.stock || 0,
      status: data.status || 'active',
      createdAt: now
    };

    products.set(product.id, product);
    skuIndex.set(product.sku, product.id);

    return product;
  },

  update(id, patch) {
    const product = products.get(id);
    if (!product) {
      return null;
    }

    const updateData = { ...patch, id };
    const errors = validateProduct(updateData, true);
    if (errors.length > 0) {
      const error = new Error(errors.join('; '));
      error.statusCode = 400;
      error.errors = errors;
      throw error;
    }

    if (patch.sku !== undefined && patch.sku !== product.sku) {
      skuIndex.delete(product.sku);
      skuIndex.set(patch.sku, id);
    }

    const updated = {
      ...product,
      name: patch.name !== undefined ? patch.name.trim() : product.name,
      sku: patch.sku !== undefined ? patch.sku.trim() : product.sku,
      description: patch.description !== undefined ? (patch.description && patch.description.trim()) : product.description,
      category: patch.category !== undefined ? patch.category : product.category,
      price: patch.price !== undefined ? Number(patch.price.toFixed(2)) : product.price,
      stock: patch.stock !== undefined ? patch.stock : product.stock,
      status: patch.status !== undefined ? patch.status : product.status
    };

    products.set(id, updated);
    return updated;
  },

  delete(id) {
    const product = products.get(id);
    if (!product) {
      return false;
    }
    skuIndex.delete(product.sku);
    products.delete(id);
    return true;
  }
};
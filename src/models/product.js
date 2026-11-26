import { v4 as uuidv4 } from 'uuid';
import { VALID_CATEGORIES, VALID_STATUSES } from '../constants.js';

/** In-memory primary store: product id → product record */
const products = new Map();
/** Secondary index: SKU → product id (enforces SKU uniqueness) */
const skuIndex = new Map();
/** Secondary index: category → Set<product id> (O(1) category filter) */
const categoryIndex = new Map();
/** Secondary index: status → Set<product id> (O(1) status filter) */
const statusIndex = new Map();

/**
 * Validates product data against business rules.
 * @param {Object} data - Product fields to validate
 * @param {string} [data.name] - Product name (required on create, 1-255 chars)
 * @param {string} [data.sku] - Stock Keeping Unit (required on create, unique, 1-64 chars)
 * @param {string} [data.description] - Optional description
 * @param {string} [data.category] - Must be one of VALID_CATEGORIES
 * @param {number} [data.price] - Positive number, max 2 decimal places (required on create)
 * @param {number} [data.stock] - Non-negative integer
 * @param {string} [data.status] - Must be one of VALID_STATUSES
 * @param {string} [data.id] - Product UUID (required for update validation)
 * @param {boolean} isUpdate - When true, relaxes required-field checks and allows SKU to remain unchanged
 * @param {boolean} skipGlobalSkuCheck - When true, skips global skuIndex uniqueness check (used by bulkCreate)
 * @returns {string[]} Array of error messages (empty if valid)
 * @throws Never throws; returns errors for caller to handle
 */
function validateProduct(data, isUpdate = false, skipGlobalSkuCheck = false) {
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
    } else if (!skipGlobalSkuCheck) {
      if (!isUpdate && skuIndex.has(data.sku)) {
        errors.push('sku must be unique');
      } else if (isUpdate && skuIndex.has(data.sku) && skuIndex.get(data.sku) !== data.id) {
        errors.push('sku must be unique');
      }
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

  if (data.price === undefined && !isUpdate) {
    errors.push('price is required');
  } else if (data.price !== undefined) {
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

/**
 * Checks if a product is soft-archived.
 * @param {Object} product - Product record
 * @returns {boolean} True if archivedAt is set
 */
function isArchived(product) {
  return product.archivedAt !== null && product.archivedAt !== undefined;
}

/**
 * Filters out archived products from a result array.
 * @param {Object[]} result - Array of product records
 * @returns {Object[]} Non-archived products only
 */
function filterArchived(result) {
  return result.filter(p => !isArchived(p));
}

/**
 * Adds product id to category and status indexes.
 * @param {Object} product - Product record
 * @returns {void}
 */
function addToIndexes(product) {
  // Category index
  const catSet = categoryIndex.get(product.category) || new Set();
  catSet.add(product.id);
  categoryIndex.set(product.category, catSet);

  // Status index
  const statSet = statusIndex.get(product.status) || new Set();
  statSet.add(product.id);
  statusIndex.set(product.status, statSet);
}

/**
 * Removes product id from category and status indexes.
 * @param {Object} product - Product record
 * @returns {void}
 */
function removeFromIndexes(product) {
  // Category index
  const catSet = categoryIndex.get(product.category);
  if (catSet) {
    catSet.delete(product.id);
    if (catSet.size === 0) categoryIndex.delete(product.category);
  }

  // Status index
  const statSet = statusIndex.get(product.status);
  if (statSet) {
    statSet.delete(product.id);
    if (statSet.size === 0) statusIndex.delete(product.status);
  }
}

/**
 * Moves product id between category/status indexes on update.
 * @param {Object} product - Updated product record
 * @param {string} oldCategory - Previous category value
 * @param {string} oldStatus - Previous status value
 * @returns {void}
 */
function updateIndexes(product, oldCategory, oldStatus) {
  if (product.category !== oldCategory) {
    // Remove from old category
    const oldCatSet = categoryIndex.get(oldCategory);
    if (oldCatSet) {
      oldCatSet.delete(product.id);
      if (oldCatSet.size === 0) categoryIndex.delete(oldCategory);
    }
    // Add to new category
    const newCatSet = categoryIndex.get(product.category) || new Set();
    newCatSet.add(product.id);
    categoryIndex.set(product.category, newCatSet);
  }

  if (product.status !== oldStatus) {
    // Remove from old status
    const oldStatSet = statusIndex.get(oldStatus);
    if (oldStatSet) {
      oldStatSet.delete(product.id);
      if (oldStatSet.size === 0) statusIndex.delete(oldStatus);
    }
    // Add to new status
    const newStatSet = statusIndex.get(product.status) || new Set();
    newStatSet.add(product.id);
    statusIndex.set(product.status, newStatSet);
  }
}

export const productModel = {
  /**
   * Returns all non-archived products matching the given filters.
   * @param {Object} filters - Query filters (all optional)
   * @param {string} [filters.category] - Exact category match
   * @param {string} [filters.status] - Exact status match
   * @param {number} [filters.minPrice] - Minimum price (inclusive)
   * @param {number} [filters.maxPrice] - Maximum price (inclusive)
   * @param {boolean} [filters.inStock] - true = stock > 0, false = stock === 0
   * @param {string} [filters.search] - Case-insensitive substring match on name or description
   * @returns {Object[]} Array of product records (never includes archived products)
   * @throws Never throws; returns empty array if no matches
   */
  findAll(filters = {}) {
    // Start with candidate set from most selective index
    let candidateIds;

    if (filters.category && filters.status) {
      // Intersect both indexes
      const catIds = categoryIndex.get(filters.category) || new Set();
      const statIds = statusIndex.get(filters.status) || new Set();
      candidateIds = new Set([...catIds].filter(id => statIds.has(id)));
    } else if (filters.category) {
      candidateIds = new Set(categoryIndex.get(filters.category) || []);
    } else if (filters.status) {
      candidateIds = new Set(statusIndex.get(filters.status) || []);
    } else {
      candidateIds = new Set(products.keys());
    }

    // Convert to product array, filter archived
    let result = Array.from(candidateIds)
      .map(id => products.get(id))
      .filter(p => p && !isArchived(p));

    // Remaining filters (price, stock, search) stay as linear filters on reduced set
    if (filters.minPrice !== undefined) {
      result = result.filter(p => p.price >= filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      result = result.filter(p => p.price <= filters.maxPrice);
    }
    if (filters.inStock !== undefined) {
      result = result.filter(p => filters.inStock ? p.stock > 0 : p.stock === 0);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    return result;
  },

  /**
   * Finds a single non-archived product by its UUID.
   * @param {string} id - Product UUID (v4)
   * @returns {Object|null} Product record or null if not found / archived
   * @throws Never throws
   */
  findById(id) {
    const product = products.get(id);
    if (!product || isArchived(product)) {
      return null;
    }
    return product;
  },

  /**
   * Finds a single non-archived product by SKU.
   * @param {string} sku - Stock Keeping Unit (case-sensitive)
   * @returns {Object|null} Product record or null if not found / archived
   * @throws Never throws
   */
  findBySku(sku) {
    const id = skuIndex.get(sku);
    const product = id ? products.get(id) : null;
    if (!product || isArchived(product)) {
      return null;
    }
    return product;
  },

  /**
   * Creates a new product with a generated UUID.
   * @param {Object} data - Product data
   * @param {string} data.name - Product name (required, trimmed, 1-255 chars)
   * @param {string} data.sku - Unique SKU (required, trimmed, 1-64 chars)
   * @param {string} [data.description=''] - Optional description (trimmed)
   * @param {string} [data.category='other'] - Category (defaults to 'other')
   * @param {number} data.price - Positive price (required, max 2 decimals)
   * @param {number} [data.stock=0] - Initial stock (non-negative integer)
   * @param {string} [data.status='active'] - Status (defaults to 'active')
   * @returns {Object} Created product with id, createdAt, archivedAt=null
   * @throws {Error} Validation error (statusCode=400, errors=string[]) if:
   *   - Required fields missing or invalid
   *   - SKU already exists (enforced via skuIndex — see business rule)
   *   - Price not positive or has >2 decimals
   *   - Category/status not in allowed lists
   */
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
      createdAt: now,
      archivedAt: null
    };

    products.set(product.id, product);
    skuIndex.set(product.sku, product.id);
    addToIndexes(product);

    return product;
  },

  /**
   * Partially updates a product by ID.
   * @param {string} id - Product UUID (v4)
   * @param {Object} patch - Fields to update (all optional)
   * @param {string} [patch.name] - New name (trimmed)
   * @param {string} [patch.sku] - New SKU (trimmed, must be unique if changed)
   * @param {string} [patch.description] - New description (trimmed)
   * @param {string} [patch.category] - New category
   * @param {number} [patch.price] - New price (positive, max 2 decimals)
   * @param {number} [patch.stock] - New stock (non-negative integer)
   * @param {string} [patch.status] - New status
   * @returns {Object|null} Updated product record, or null if not found / archived
   * @throws {Error} Validation error (statusCode=400, errors=string[]) if:
   *   - Any provided field fails validation
   *   - New SKU conflicts with another product (enforced via skuIndex)
   * @note id and createdAt are immutable — never overwritten
   * @note SKU change updates skuIndex atomically
   */
  update(id, patch) {
    const product = products.get(id);
    if (!product || isArchived(product)) {
      return null;
    }

    // Capture old values for index maintenance
    const oldCategory = product.category;
    const oldStatus = product.status;

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
    updateIndexes(updated, oldCategory, oldStatus);
    return updated;
  },

  /**
   * Soft-archives a product (sets archivedAt timestamp).
   * @param {string} id - Product UUID (v4)
   * @returns {boolean} True if archived, false if not found / already archived
   * @throws Never throws
   * @note Archived products are excluded from findAll, findById, findBySku
   * @note Record is retained in products Map for potential restore
   * @note skuIndex entry remains (prevents SKU reuse while archived)
   */
  delete(id) {
    const product = products.get(id);
    if (!product || isArchived(product)) {
      return false;
    }
    product.archivedAt = new Date();
    removeFromIndexes(product);
    return true;
  },

  /**
   * Restores a soft-archived product (clears archivedAt).
   * @param {string} id - Product UUID (v4)
   * @returns {boolean} True if restored, false if not found / not archived
   * @throws Never throws
   * @note Restored product immediately reappears in findAll, findById, findBySku
   */
  restore(id) {
    const product = products.get(id);
    if (!product || !isArchived(product)) {
      return false;
    }
    product.archivedAt = null;
    addToIndexes(product);
    return true;
  },

  /**
   * Clears all in-memory stores (testing only).
   * @returns {void}
   * @throws Never throws
   * @internal Not part of public API — used by test suite for isolation
   */
  _clear() {
    products.clear();
    skuIndex.clear();
    categoryIndex.clear();
    statusIndex.clear();
  },

  /**
   * Creates multiple products atomically (all-or-nothing).
   * Validates all products first, then creates them only if all pass.
   * @param {Object[]} items - Array of product data (each follows ProductInput schema)
   * @returns {Object[]} Array of created products with id, createdAt, archivedAt=null
   * @throws {Error} Validation error (statusCode=400, errors=string[]) if:
   *   - items is not an array or is empty
   *   - Any product fails validation (required fields, SKU uniqueness, price format, etc.)
   *   - Any SKU in batch duplicates another in batch or existing store
   * @note Atomic: either all products are created or none are
   * @note SKU uniqueness enforced across batch + existing store
   */
  bulkCreate(items) {
    if (!Array.isArray(items) || items.length === 0) {
      const error = new Error('Request body must be a non-empty array of products');
      error.statusCode = 400;
      error.errors = ['Request body must be a non-empty array'];
      throw error;
    }

    // Validate all items first (collect all errors)
    const allErrors = [];
    const seenSkus = new Set();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemErrors = validateProduct(item, false, true);

      // Check for duplicate SKU within the batch
      if (item.sku) {
        const trimmedSku = item.sku.trim();
        if (seenSkus.has(trimmedSku)) {
          itemErrors.push('sku must be unique within batch');
        } else if (skuIndex.has(trimmedSku)) {
          itemErrors.push('sku must be unique (conflicts with existing product)');
        } else {
          seenSkus.add(trimmedSku);
        }
      }

      if (itemErrors.length > 0) {
        allErrors.push(...itemErrors.map(e => `Item ${i}: ${e}`));
      }
    }

    if (allErrors.length > 0) {
      const error = new Error(allErrors.join('; '));
      error.statusCode = 400;
      error.errors = allErrors;
      throw error;
    }

    // All valid — create atomically
    const now = new Date();
    const created = [];

    for (const item of items) {
      const product = {
        id: uuidv4(),
        name: item.name.trim(),
        sku: item.sku.trim(),
        description: (item.description && item.description.trim()) || '',
        category: item.category || 'other',
        price: Number(item.price.toFixed(2)),
        stock: item.stock || 0,
        status: item.status || 'active',
        createdAt: now,
        archivedAt: null
      };

      products.set(product.id, product);
      skuIndex.set(product.sku, product.id);
      addToIndexes(product);
      created.push(product);
    }

    return created;
  }
};
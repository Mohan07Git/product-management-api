import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { productModel } from '../src/models/product.js';

describe('productModel', () => {
  beforeEach(() => {
    productModel._clear();
  });

  describe('create', () => {
    test('creates a product with required fields', () => {
      const product = productModel.create({
        name: 'Test Product',
        sku: 'TEST-001',
        price: 29.99
      });

      assert.ok(product.id);
      assert.strictEqual(product.name, 'Test Product');
      assert.strictEqual(product.sku, 'TEST-001');
      assert.strictEqual(product.price, 29.99);
      assert.strictEqual(product.stock, 0);
      assert.strictEqual(product.status, 'active');
      assert.strictEqual(product.category, 'other');
      assert.ok(product.createdAt instanceof Date);
      assert.strictEqual(product.archivedAt, null);
    });

    test('creates a product with all fields', () => {
      const product = productModel.create({
        name: 'Full Product',
        sku: 'FULL-001',
        description: 'A complete product',
        category: 'electronics',
        price: 99.99,
        stock: 10,
        status: 'inactive'
      });

      assert.strictEqual(product.description, 'A complete product');
      assert.strictEqual(product.category, 'electronics');
      assert.strictEqual(product.stock, 10);
      assert.strictEqual(product.status, 'inactive');
    });

    test('throws error for missing name', () => {
      assert.throws(() => {
        productModel.create({ sku: 'TEST-002', price: 10 });
      }, /name is required/);
    });

    test('throws error for missing sku', () => {
      assert.throws(() => {
        productModel.create({ name: 'Test', price: 10 });
      }, /sku is required/);
    });

    test('throws error for missing price', () => {
      assert.throws(() => {
        productModel.create({ name: 'Test', sku: 'TEST-003' });
      }, /price is required/);
    });

    test('throws error for duplicate sku', () => {
      productModel.create({ name: 'Product 1', sku: 'DUP-001', price: 10 });
      assert.throws(() => {
        productModel.create({ name: 'Product 2', sku: 'DUP-001', price: 20 });
      }, /sku must be unique/);
    });

    test('throws error for invalid category', () => {
      assert.throws(() => {
        productModel.create({ name: 'Test', sku: 'CAT-001', price: 10, category: 'invalid' });
      }, /category must be one of/);
    });

    test('throws error for invalid status', () => {
      assert.throws(() => {
        productModel.create({ name: 'Test', sku: 'STAT-001', price: 10, status: 'invalid' });
      }, /status must be one of/);
    });

    test('throws error for negative price', () => {
      assert.throws(() => {
        productModel.create({ name: 'Test', sku: 'PRICE-001', price: -5 });
      }, /price must be a positive number/);
    });

    test('throws error for zero price', () => {
      assert.throws(() => {
        productModel.create({ name: 'Test', sku: 'PRICE-002', price: 0 });
      }, /price must be a positive number/);
    });

    test('throws error for price with more than 2 decimals', () => {
      assert.throws(() => {
        productModel.create({ name: 'Test', sku: 'DEC-001', price: 10.123 });
      }, /price must have up to 2 decimal places/);
    });

    test('throws error for negative stock', () => {
      assert.throws(() => {
        productModel.create({ name: 'Test', sku: 'STOCK-001', price: 10, stock: -1 });
      }, /stock must be a non-negative integer/);
    });

    test('throws error for invalid name (non-string)', () => {
      assert.throws(() => {
        productModel.create({ name: 123, sku: 'NAME-001', price: 10 });
      }, /name must be a non-empty string/);
    });

    test('throws error for empty name string', () => {
      assert.throws(() => {
        productModel.create({ name: '', sku: 'NAME-002', price: 10 });
      }, /name must be a non-empty string/);
    });

    test('throws error for invalid sku (non-string)', () => {
      assert.throws(() => {
        productModel.create({ name: 'Test', sku: 123, price: 10 });
      }, /sku must be a non-empty string/);
    });

    test('throws error for empty sku string', () => {
      assert.throws(() => {
        productModel.create({ name: 'Test', sku: '', price: 10 });
      }, /sku must be a non-empty string/);
    });

    test('throws error for invalid description (non-string)', () => {
      assert.throws(() => {
        productModel.create({ name: 'Test', sku: 'DESC-001', price: 10, description: 123 });
      }, /description must be a string/);
    });

    test('trims whitespace from name and sku', () => {
      const product = productModel.create({
        name: '  Trimmed  ',
        sku: '  TRIM-001  ',
        price: 10
      });
      assert.strictEqual(product.name, 'Trimmed');
      assert.strictEqual(product.sku, 'TRIM-001');
    });
  });

  describe('findById', () => {
    test('returns product by id', () => {
      const created = productModel.create({ name: 'Find Me', sku: 'FIND-001', price: 10 });
      const found = productModel.findById(created.id);
      assert.deepStrictEqual(found, created);
    });

    test('returns null for non-existent id', () => {
      const found = productModel.findById('00000000-0000-0000-0000-000000000000');
      assert.strictEqual(found, null);
    });

    test('returns null for archived product', () => {
      const created = productModel.create({ name: 'Archived', sku: 'ARCH-001', price: 10 });
      productModel.delete(created.id);
      const found = productModel.findById(created.id);
      assert.strictEqual(found, null);
    });
  });

  describe('findBySku', () => {
    test('returns product by sku', () => {
      const created = productModel.create({ name: 'SKU Find', sku: 'SKU-FIND-001', price: 10 });
      const found = productModel.findBySku('SKU-FIND-001');
      assert.deepStrictEqual(found, created);
    });

    test('returns null for non-existent sku', () => {
      const found = productModel.findBySku('NONEXISTENT');
      assert.strictEqual(found, null);
    });

    test('returns null for archived product', () => {
      const created = productModel.create({ name: 'Archived SKU', sku: 'ARCH-SKU-001', price: 10 });
      productModel.delete(created.id);
      const found = productModel.findBySku('ARCH-SKU-001');
      assert.strictEqual(found, null);
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      // Clear and create test data
      productModel.create({ name: 'Electronics A', sku: 'EA-001', price: 100, category: 'electronics', stock: 5 });
      productModel.create({ name: 'Electronics B', sku: 'EB-002', price: 200, category: 'electronics', stock: 0 });
      productModel.create({ name: 'Clothing A', sku: 'CA-001', price: 50, category: 'clothing', stock: 10 });
      productModel.create({ name: 'Book A', sku: 'BA-001', price: 20, category: 'books', stock: 3 });
    });

    test('returns all non-archived products', () => {
      const all = productModel.findAll();
      assert.strictEqual(all.length, 4);
    });

    test('returns empty array when store is empty', () => {
      productModel._clear();
      const all = productModel.findAll();
      assert.strictEqual(all.length, 0);
      assert.ok(Array.isArray(all));
    });

    test('filters by category', () => {
      const electronics = productModel.findAll({ category: 'electronics' });
      assert.strictEqual(electronics.length, 2);
      assert.ok(electronics.every(p => p.category === 'electronics'));
    });

    test('filters by status', () => {
      const active = productModel.findAll({ status: 'active' });
      assert.strictEqual(active.length, 4);
      assert.ok(active.every(p => p.status === 'active'));
    });

    test('filters by minPrice', () => {
      const expensive = productModel.findAll({ minPrice: 100 });
      assert.strictEqual(expensive.length, 2);
      assert.ok(expensive.every(p => p.price >= 100));
    });

    test('filters by maxPrice', () => {
      const cheap = productModel.findAll({ maxPrice: 50 });
      assert.strictEqual(cheap.length, 2);
      assert.ok(cheap.every(p => p.price <= 50));
    });

    test('filters by inStock', () => {
      const inStock = productModel.findAll({ inStock: true });
      assert.strictEqual(inStock.length, 3);
      assert.ok(inStock.every(p => p.stock > 0));

      const outOfStock = productModel.findAll({ inStock: false });
      assert.strictEqual(outOfStock.length, 1);
      assert.ok(outOfStock.every(p => p.stock === 0));
    });

    test('filters by search (name)', () => {
      const results = productModel.findAll({ search: 'Electronics' });
      assert.strictEqual(results.length, 2);
      assert.ok(results.every(p => p.name.includes('Electronics')));
    });

    test('filters by search (description)', () => {
      // Create product with description
      productModel.create({ name: 'Test', sku: 'DESC-001', price: 10, description: 'special feature' });
      const results = productModel.findAll({ search: 'special' });
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].sku, 'DESC-001');
    });

    test('search is case-insensitive', () => {
      const results = productModel.findAll({ search: 'electronics' });
      assert.strictEqual(results.length, 2);
    });

    test('combines multiple filters', () => {
      const results = productModel.findAll({
        category: 'electronics',
        minPrice: 150,
        inStock: true
      });
      // EA-001: price 100 (below 150), EB-002: price 200 but stock 0 (out of stock)
      // So no results match - test was wrong
      assert.strictEqual(results.length, 0);
    });

    test('excludes archived products', () => {
      const created = productModel.create({ name: 'To Archive', sku: 'ARCH-002', price: 10 });
      productModel.delete(created.id);
      const all = productModel.findAll();
      assert.strictEqual(all.length, 4); // Original 4, not 5
    });
  });

  describe('update', () => {
    test('updates product fields', () => {
      const created = productModel.create({ name: 'Original', sku: 'UPD-001', price: 10 });
      const updated = productModel.update(created.id, { name: 'Updated', price: 20 });

      assert.strictEqual(updated.name, 'Updated');
      assert.strictEqual(updated.price, 20);
      assert.strictEqual(updated.sku, 'UPD-001'); // Unchanged
      assert.strictEqual(updated.id, created.id);
      assert.strictEqual(updated.createdAt.getTime(), created.createdAt.getTime());
    });

    test('returns null for non-existent id', () => {
      const result = productModel.update('00000000-0000-0000-0000-000000000000', { name: 'Test' });
      assert.strictEqual(result, null);
    });

    test('returns null for archived product', () => {
      const created = productModel.create({ name: 'Archived', sku: 'ARCH-UPD-001', price: 10 });
      productModel.delete(created.id);
      const result = productModel.update(created.id, { name: 'Test' });
      assert.strictEqual(result, null);
    });

    test('updates sku and maintains index', () => {
      const created = productModel.create({ name: 'SKU Test', sku: 'OLD-SKU', price: 10 });
      const updated = productModel.update(created.id, { sku: 'NEW-SKU' });

      assert.strictEqual(updated.sku, 'NEW-SKU');
      assert.strictEqual(productModel.findBySku('OLD-SKU'), null);
      assert.deepStrictEqual(productModel.findBySku('NEW-SKU'), updated);
    });

    test('throws error for duplicate sku on update', () => {
      productModel.create({ name: 'Product 1', sku: 'SKU-1', price: 10 });
      const product2 = productModel.create({ name: 'Product 2', sku: 'SKU-2', price: 20 });

      assert.throws(() => {
        productModel.update(product2.id, { sku: 'SKU-1' });
      }, /sku must be unique/);
    });

    test('throws error for invalid name on update', () => {
      const created = productModel.create({ name: 'Original', sku: 'UPD-001', price: 10 });
      assert.throws(() => {
        productModel.update(created.id, { name: '' });
      }, /name must be a non-empty string/);
    });

    test('throws error for invalid sku on update', () => {
      const created = productModel.create({ name: 'Original', sku: 'UPD-002', price: 10 });
      assert.throws(() => {
        productModel.update(created.id, { sku: 123 });
      }, /sku must be a non-empty string/);
    });

    test('throws error for invalid description on update', () => {
      const created = productModel.create({ name: 'Original', sku: 'UPD-003', price: 10 });
      assert.throws(() => {
        productModel.update(created.id, { description: 123 });
      }, /description must be a string/);
    });

    test('allows keeping same sku on update', () => {
      const created = productModel.create({ name: 'Test', sku: 'SAME-SKU', price: 10 });
      const updated = productModel.update(created.id, { name: 'Updated' });
      assert.strictEqual(updated.sku, 'SAME-SKU');
    });
  });

  describe('delete (soft delete)', () => {
    test('archives product', () => {
      const created = productModel.create({ name: 'To Delete', sku: 'DEL-001', price: 10 });
      const result = productModel.delete(created.id);
      assert.strictEqual(result, true);

      const found = productModel.findById(created.id);
      assert.strictEqual(found, null);

      // Product can be restored, proving it still exists with archivedAt
      const restored = productModel.restore(created.id);
      assert.strictEqual(restored, true);
      const restoredProduct = productModel.findById(created.id);
      assert.ok(restoredProduct);
      assert.strictEqual(restoredProduct.archivedAt, null);
    });

    test('returns false for non-existent id', () => {
      const result = productModel.delete('00000000-0000-0000-0000-000000000000');
      assert.strictEqual(result, false);
    });

    test('returns false for already archived product', () => {
      const created = productModel.create({ name: 'Test', sku: 'DEL-002', price: 10 });
      productModel.delete(created.id);
      const result = productModel.delete(created.id);
      assert.strictEqual(result, false);
    });
  });

  describe('restore', () => {
    test('restores archived product', () => {
      const created = productModel.create({ name: 'To Restore', sku: 'RES-001', price: 10 });
      productModel.delete(created.id);
      const result = productModel.restore(created.id);
      assert.strictEqual(result, true);

      const found = productModel.findById(created.id);
      assert.deepStrictEqual(found, created);
      assert.strictEqual(found.archivedAt, null);
    });

    test('returns false for non-existent id', () => {
      const result = productModel.restore('00000000-0000-0000-0000-000000000000');
      assert.strictEqual(result, false);
    });

    test('returns false for non-archived product', () => {
      const created = productModel.create({ name: 'Active', sku: 'RES-002', price: 10 });
      const result = productModel.restore(created.id);
      assert.strictEqual(result, false);
    });
  });

  describe('categoryIndex and statusIndex maintenance', () => {
    test('create adds to category and status indexes', () => {
      productModel.create({ name: 'A', sku: 'A1', price: 10, category: 'electronics', status: 'active' });
      productModel.create({ name: 'B', sku: 'B1', price: 10, category: 'clothing', status: 'inactive' });

      // Verify indexes populated via findAll behavior
      const electronics = productModel.findAll({ category: 'electronics' });
      assert.strictEqual(electronics.length, 1);
      const inactive = productModel.findAll({ status: 'inactive' });
      assert.strictEqual(inactive.length, 1);
    });

    test('update category moves product between category indexes', () => {
      const p = productModel.create({ name: 'Test', sku: 'T1', price: 10, category: 'electronics' });
      productModel.update(p.id, { category: 'clothing' });

      const electronics = productModel.findAll({ category: 'electronics' });
      const clothing = productModel.findAll({ category: 'clothing' });
      assert.strictEqual(electronics.length, 0);
      assert.strictEqual(clothing.length, 1);
    });

    test('update status moves product between status indexes', () => {
      const p = productModel.create({ name: 'Test', sku: 'T2', price: 10, status: 'active' });
      productModel.update(p.id, { status: 'discontinued' });

      const active = productModel.findAll({ status: 'active' });
      const discontinued = productModel.findAll({ status: 'discontinued' });
      assert.strictEqual(active.length, 0);
      assert.strictEqual(discontinued.length, 1);
    });

    test('update multiple fields maintains indexes correctly', () => {
      const p = productModel.create({ name: 'Test', sku: 'T3', price: 10, category: 'electronics', status: 'active' });
      productModel.update(p.id, { category: 'books', status: 'inactive' });

      const electronics = productModel.findAll({ category: 'electronics' });
      const books = productModel.findAll({ category: 'books' });
      const active = productModel.findAll({ status: 'active' });
      const inactive = productModel.findAll({ status: 'inactive' });
      assert.strictEqual(electronics.length, 0);
      assert.strictEqual(books.length, 1);
      assert.strictEqual(active.length, 0);
      assert.strictEqual(inactive.length, 1);
    });

    test('delete removes from indexes', () => {
      const p = productModel.create({ name: 'Test', sku: 'T4', price: 10, category: 'books' });
      productModel.delete(p.id);

      const books = productModel.findAll({ category: 'books' });
      assert.strictEqual(books.length, 0);
    });

    test('restore re-adds to indexes', () => {
      const p = productModel.create({ name: 'Test', sku: 'T5', price: 10, category: 'food' });
      productModel.delete(p.id);
      productModel.restore(p.id);

      const food = productModel.findAll({ category: 'food' });
      assert.strictEqual(food.length, 1);
    });

    test('bulkCreate populates indexes for all items', () => {
      productModel.bulkCreate([
        { name: 'A', sku: 'BA1', price: 10, category: 'electronics' },
        { name: 'B', sku: 'BA2', price: 10, category: 'electronics' },
        { name: 'C', sku: 'BA3', price: 10, category: 'clothing' }
      ]);

      const electronics = productModel.findAll({ category: 'electronics' });
      const clothing = productModel.findAll({ category: 'clothing' });
      assert.strictEqual(electronics.length, 2);
      assert.strictEqual(clothing.length, 1);
    });

    test('_clear empties all indexes', () => {
      productModel.create({ name: 'A', sku: 'C1', price: 10 });
      productModel._clear();
      const all = productModel.findAll();
      assert.strictEqual(all.length, 0);
    });

    test('findAll with combined category and status uses intersection', () => {
      productModel.create({ name: 'A', sku: 'I1', price: 10, category: 'electronics', status: 'active' });
      productModel.create({ name: 'B', sku: 'I2', price: 10, category: 'electronics', status: 'inactive' });
      productModel.create({ name: 'C', sku: 'I3', price: 10, category: 'clothing', status: 'active' });

      const results = productModel.findAll({ category: 'electronics', status: 'active' });
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].sku, 'I1');
    });
  });
});
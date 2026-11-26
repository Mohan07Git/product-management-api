import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { productModel } from '../src/models/product.js';

const app = createApp();

function getErrorMessage(res) {
  const err = res.body.error;
  if (Array.isArray(err)) return err.join(' ');
  return err || res.body.errors?.join(' ') || res.body.message || '';
}

describe('Products API Routes', () => {
  beforeEach(() => {
    productModel._clear();
  });

  describe('GET /products', () => {
    beforeEach(() => {
      productModel.create({ name: 'Product A', sku: 'GET-A', price: 10, category: 'electronics', stock: 5 });
      productModel.create({ name: 'Product B', sku: 'GET-B', price: 20, category: 'clothing', stock: 0 });
      productModel.create({ name: 'Product C', sku: 'GET-C', price: 30, category: 'electronics', stock: 3 });
    });

    test('returns all products', async () => {
      const res = await request(app).get('/products').expect(200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 3);
    });

    test('filters by category', async () => {
      const res = await request(app).get('/products?category=electronics').expect(200);
      assert.strictEqual(res.body.data.length, 2);
      assert.ok(res.body.data.every(p => p.category === 'electronics'));
    });

    test('filters by status', async () => {
      const res = await request(app).get('/products?status=active').expect(200);
      assert.strictEqual(res.body.data.length, 3);
    });

    test('filters by minPrice', async () => {
      const res = await request(app).get('/products?minPrice=20').expect(200);
      assert.strictEqual(res.body.data.length, 2);
      assert.ok(res.body.data.every(p => p.price >= 20));
    });

    test('filters by maxPrice', async () => {
      const res = await request(app).get('/products?maxPrice=20').expect(200);
      assert.strictEqual(res.body.data.length, 2);
      assert.ok(res.body.data.every(p => p.price <= 20));
    });

    test('filters by inStock', async () => {
      const res = await request(app).get('/products?inStock=true').expect(200);
      assert.strictEqual(res.body.data.length, 2);
      assert.ok(res.body.data.every(p => p.stock > 0));
    });

    test('filters by search', async () => {
      const res = await request(app).get('/products?search=Product A').expect(200);
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].sku, 'GET-A');
    });

    test('returns 400 for invalid category', async () => {
      const res = await request(app).get('/products?category=invalid').expect(400);
      assert.strictEqual(res.body.success, false);
    });

    test('returns 400 for invalid status', async () => {
      const res = await request(app).get('/products?status=invalid').expect(400);
      assert.strictEqual(res.body.success, false);
    });

    test('returns 400 for negative minPrice', async () => {
      const res = await request(app).get('/products?minPrice=-10').expect(400);
      assert.strictEqual(res.body.success, false);
    });

    test('returns 400 for invalid inStock', async () => {
      const res = await request(app).get('/products?inStock=yes').expect(400);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('GET /products/:id', () => {
    let createdId;

    beforeEach(() => {
      const product = productModel.create({ name: 'Single Product', sku: 'SINGLE-001', price: 50 });
      createdId = product.id;
    });

    test('returns product by id', async () => {
      const res = await request(app).get(`/products/${createdId}`).expect(200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, createdId);
      assert.strictEqual(res.body.data.sku, 'SINGLE-001');
    });

    test('returns 404 for non-existent id', async () => {
      const res = await request(app).get('/products/00000000-0000-0000-0000-000000000000').expect(404);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.includes('Product not found'));
    });

    test('returns 404 for archived product', async () => {
      productModel.delete(createdId);
      const res = await request(app).get(`/products/${createdId}`).expect(404);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('POST /products', () => {
    test('creates a new product', async () => {
      const res = await request(app)
        .post('/products')
        .send({ name: 'New Product', sku: 'NEW-001', price: 99.99 })
        .expect(201);

      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.strictEqual(res.body.data.name, 'New Product');
      assert.strictEqual(res.body.data.sku, 'NEW-001');
      assert.strictEqual(res.body.data.price, 99.99);
    });

    test('creates product with all fields', async () => {
      const res = await request(app)
        .post('/products')
        .send({
          name: 'Full Product',
          sku: 'FULL-001',
          description: 'Description',
          category: 'books',
          price: 19.99,
          stock: 5,
          status: 'inactive'
        })
        .expect(201);

      assert.strictEqual(res.body.data.description, 'Description');
      assert.strictEqual(res.body.data.category, 'books');
      assert.strictEqual(res.body.data.stock, 5);
      assert.strictEqual(res.body.data.status, 'inactive');
    });

test('returns 400 for missing name', async () => {
  const res = await request(app)
    .post('/products')
    .send({ sku: 'MISSING-NAME', price: 10 })
    .expect(400);

  assert.strictEqual(res.body.success, false);
  assert.ok(getErrorMessage(res).includes('name is required'));
});

test('returns 400 for missing sku', async () => {
  const res = await request(app)
    .post('/products')
    .send({ name: 'Test', price: 10 })
    .expect(400);

  assert.ok(getErrorMessage(res).includes('sku is required'));
});

test('returns 400 for missing price', async () => {
  const res = await request(app)
    .post('/products')
    .send({ name: 'Test', sku: 'MISSING-PRICE' })
    .expect(400);

  assert.ok(getErrorMessage(res).includes('price is required'));
});

test('returns 400 for duplicate sku', async () => {
  await request(app)
    .post('/products')
    .send({ name: 'First', sku: 'DUP-001', price: 10 })
    .expect(201);

  const res = await request(app)
    .post('/products')
    .send({ name: 'Second', sku: 'DUP-001', price: 20 })
    .expect(400);

  assert.ok(getErrorMessage(res).includes('sku must be unique'));
});

test('returns 400 for invalid category', async () => {
  const res = await request(app)
    .post('/products')
    .send({ name: 'Test', sku: 'CAT-001', price: 10, category: 'invalid' })
    .expect(400);

  assert.ok(getErrorMessage(res).includes('category must be one of'));
});

    test('returns 400 for invalid price (negative)', async () => {
      const res = await request(app)
        .post('/products')
        .send({ name: 'Test', sku: 'PRICE-001', price: -5 })
        .expect(400);

      assert.ok(getErrorMessage(res).includes('price must be a positive number'));
    });

    test('returns 400 for price with too many decimals', async () => {
      const res = await request(app)
        .post('/products')
        .send({ name: 'Test', sku: 'DEC-001', price: 10.123 })
        .expect(400);

      assert.ok(getErrorMessage(res).includes('price must have up to 2 decimal places'));
    });
  });

  describe('PATCH /products/:id', () => {
    let createdId;

    beforeEach(() => {
      const product = productModel.create({ name: 'Original', sku: 'PATCH-001', price: 10 });
      createdId = product.id;
    });

    test('updates product fields', async () => {
      const res = await request(app)
        .patch(`/products/${createdId}`)
        .send({ name: 'Updated', price: 20 })
        .expect(200);

      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.name, 'Updated');
      assert.strictEqual(res.body.data.price, 20);
      assert.strictEqual(res.body.data.sku, 'PATCH-001');
    });

    test('returns 404 for non-existent id', async () => {
      // Use a valid UUID v4 format that doesn't exist (version 4 = '4' at position 14)
      const res = await request(app)
        .patch('/products/123e4567-e89b-42d3-a456-426614174000')
        .send({ name: 'Test' })
        .expect(404);

      assert.strictEqual(res.body.success, false);
    });

    test('returns 404 for archived product', async () => {
      productModel.delete(createdId);
      const res = await request(app)
        .patch(`/products/${createdId}`)
        .send({ name: 'Test' })
        .expect(404);

      assert.strictEqual(res.body.success, false);
    });

    test('returns 400 for invalid id format', async () => {
      const res = await request(app)
        .patch('/products/invalid-id')
        .send({ name: 'Test' })
        .expect(400);

      assert.strictEqual(res.body.success, false);
      assert.ok(getErrorMessage(res).includes('id must be a valid UUID'));
    });

    test('updates sku and maintains uniqueness', async () => {
      // Create another product
      const other = productModel.create({ name: 'Other', sku: 'OTHER-001', price: 10 });

      const res = await request(app)
        .patch(`/products/${createdId}`)
        .send({ sku: 'NEW-SKU' })
        .expect(200);

      assert.strictEqual(res.body.data.sku, 'NEW-SKU');
      assert.strictEqual(productModel.findBySku('PATCH-001'), null);
      const found = productModel.findBySku('NEW-SKU');
      assert.ok(found);
      assert.strictEqual(found.id, res.body.data.id);
      assert.strictEqual(found.sku, res.body.data.sku);
    });

    test('returns 400 for duplicate sku on update', async () => {
      productModel.create({ name: 'Other', sku: 'EXISTING-001', price: 10 });

      const res = await request(app)
        .patch(`/products/${createdId}`)
        .send({ sku: 'EXISTING-001' })
        .expect(400);

      assert.ok(res.body.error.includes('sku must be unique'));
    });
  });

  describe('DELETE /products/:id', () => {
    let createdId;

    beforeEach(() => {
      const product = productModel.create({ name: 'To Delete', sku: 'DELETE-001', price: 10 });
      createdId = product.id;
    });

    test('archives product', async () => {
      const res = await request(app).delete(`/products/${createdId}`).expect(200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.message, 'Product archived successfully');
    });

    test('returns 404 for non-existent id', async () => {
      const res = await request(app).delete('/products/00000000-0000-0000-0000-000000000000').expect(404);
      assert.strictEqual(res.body.success, false);
    });

    test('returns 404 for already archived product', async () => {
      await request(app).delete(`/products/${createdId}`).expect(200);
      const res = await request(app).delete(`/products/${createdId}`).expect(404);
      assert.strictEqual(res.body.success, false);
    });

    test('archived product not returned in GET', async () => {
      await request(app).delete(`/products/${createdId}`).expect(200);
      const res = await request(app).get('/products').expect(200);
      assert.ok(!res.body.data.find(p => p.id === createdId));
    });
  });

  describe('DELETE /products/:id/restore', () => {
    let createdId;

    beforeEach(() => {
      const product = productModel.create({ name: 'To Restore', sku: 'RESTORE-001', price: 10 });
      createdId = product.id;
      productModel.delete(createdId);
    });

    test('restores archived product', async () => {
      const res = await request(app).delete(`/products/${createdId}/restore`).expect(200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.message, 'Product restored successfully');
    });

    test('restored product appears in GET', async () => {
      await request(app).delete(`/products/${createdId}/restore`).expect(200);
      const res = await request(app).get('/products').expect(200);
      assert.ok(res.body.data.find(p => p.id === createdId));
    });

    test('returns 404 for non-existent id', async () => {
      const res = await request(app).delete('/products/00000000-0000-0000-0000-000000000000/restore').expect(404);
      assert.strictEqual(res.body.success, false);
    });

    test('returns 404 for non-archived product', async () => {
      const active = productModel.create({ name: 'Active', sku: 'ACTIVE-001', price: 10 });
      const res = await request(app).delete(`/products/${active.id}/restore`).expect(404);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('POST /products/bulk', () => {
    test('creates multiple products successfully', async () => {
      const payload = [
        { name: 'Product A', sku: 'BULK-A', price: 10, category: 'electronics', stock: 5 },
        { name: 'Product B', sku: 'BULK-B', price: 20, category: 'clothing', stock: 3 },
        { name: 'Product C', sku: 'BULK-C', price: 30, category: 'books', stock: 1 }
      ];

      const res = await request(app)
        .post('/products/bulk')
        .send(payload)
        .expect(201);

      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 3);
      assert.ok(res.body.data.every(p => p.id && p.createdAt && p.archivedAt === null));
      assert.ok(res.body.data.some(p => p.sku === 'BULK-A'));
      assert.ok(res.body.data.some(p => p.sku === 'BULK-B'));
      assert.ok(res.body.data.some(p => p.sku === 'BULK-C'));

      // Verify products exist in store
      const getRes = await request(app).get('/products').expect(200);
      assert.strictEqual(getRes.body.data.length, 3);
    });

    test('creates products with optional fields and defaults', async () => {
      const payload = [
        { name: 'Minimal', sku: 'MIN-001', price: 9.99 },
        { name: 'With Desc', sku: 'MIN-002', price: 19.99, description: 'Test description' }
      ];

      const res = await request(app)
        .post('/products/bulk')
        .send(payload)
        .expect(201);

      assert.strictEqual(res.body.data.length, 2);
      assert.strictEqual(res.body.data[0].category, 'other');
      assert.strictEqual(res.body.data[0].status, 'active');
      assert.strictEqual(res.body.data[0].stock, 0);
      assert.strictEqual(res.body.data[0].description, '');
      assert.strictEqual(res.body.data[1].description, 'Test description');
    });

    test('rejects entire batch when one item has validation error', async () => {
      const payload = [
        { name: 'Valid Product', sku: 'VALID-001', price: 10 },
        { name: '', sku: 'INVALID-001', price: 10 }, // invalid: empty name
        { name: 'Another Valid', sku: 'VALID-002', price: 20 }
      ];

      const res = await request(app)
        .post('/products/bulk')
        .send(payload)
        .expect(400);

      assert.strictEqual(res.body.success, false);
      const errorMsg = Array.isArray(res.body.error) ? res.body.error.join(' ') : res.body.error;
      assert.ok(errorMsg.includes('name cannot be empty'));

      // Verify no products were created (atomic)
      const getRes = await request(app).get('/products').expect(200);
      assert.strictEqual(getRes.body.data.length, 0);
    });

    test('rejects batch with duplicate SKU within batch', async () => {
      const payload = [
        { name: 'Product A', sku: 'DUP-BATCH', price: 10 },
        { name: 'Product B', sku: 'DUP-BATCH', price: 20 } // duplicate SKU in batch
      ];

      const res = await request(app)
        .post('/products/bulk')
        .send(payload)
        .expect(400);

      assert.strictEqual(res.body.success, false);
      const errorMsg = Array.isArray(res.body.error) ? res.body.error.join(' ') : res.body.error;
      assert.ok(errorMsg.includes('sku must be unique within batch'));

      // Verify no products were created
      const getRes = await request(app).get('/products').expect(200);
      assert.strictEqual(getRes.body.data.length, 0);
    });

    test('rejects batch when SKU conflicts with existing product', async () => {
      // Pre-create a product
      await productModel.create({ name: 'Existing', sku: 'EXISTING-SKU', price: 50 });

      const payload = [
        { name: 'New Product', sku: 'EXISTING-SKU', price: 100 }, // conflicts with existing
        { name: 'Another New', sku: 'NEW-SKU', price: 200 }
      ];

      const res = await request(app)
        .post('/products/bulk')
        .send(payload)
        .expect(400);

      assert.strictEqual(res.body.success, false);
      const errorMsg = Array.isArray(res.body.error) ? res.body.error.join(' ') : res.body.error;
      assert.ok(errorMsg.includes('conflicts with existing product'));

      // Verify only original product exists
      const getRes = await request(app).get('/products').expect(200);
      assert.strictEqual(getRes.body.data.length, 1);
      assert.strictEqual(getRes.body.data[0].sku, 'EXISTING-SKU');
    });

    test('rejects batch exceeding 100 items', async () => {
      const payload = Array.from({ length: 101 }, (_, i) => ({
        name: `Product ${i}`,
        sku: `BIG-${i}`,
        price: 10 + i
      }));

      const res = await request(app)
        .post('/products/bulk')
        .send(payload)
        .expect(400);

      assert.strictEqual(res.body.success, false);
      const errorMsg = Array.isArray(res.body.error) ? res.body.error.join(' ') : res.body.error;
      assert.ok(errorMsg.includes('1 to 100 items'));

      // Verify no products were created
      const getRes = await request(app).get('/products').expect(200);
      assert.strictEqual(getRes.body.data.length, 0);
    });

    test('rejects empty array body', async () => {
      const res = await request(app)
        .post('/products/bulk')
        .send([])
        .expect(400);

      assert.strictEqual(res.body.success, false);
      const errorMsg = Array.isArray(res.body.error) ? res.body.error.join(' ') : res.body.error;
      assert.ok(errorMsg.includes('1 to 100 items'));

      // Verify no products were created
      const getRes = await request(app).get('/products').expect(200);
      assert.strictEqual(getRes.body.data.length, 0);
    });

    test('rejects non-array body', async () => {
      const res = await request(app)
        .post('/products/bulk')
        .send({ name: 'Not an array', sku: 'NOT-ARRAY', price: 10 })
        .expect(400);

      assert.strictEqual(res.body.success, false);
      const errorMsg = Array.isArray(res.body.error) ? res.body.error.join(' ') : res.body.error;
      assert.ok(errorMsg.includes('array'));
    });

    test('rejects batch with invalid price format', async () => {
      const payload = [
        { name: 'Valid', sku: 'VALID-PRICE', price: 10 },
        { name: 'Invalid Price', sku: 'INVALID-PRICE', price: 10.123 } // too many decimals
      ];

      const res = await request(app)
        .post('/products/bulk')
        .send(payload)
        .expect(400);

      assert.strictEqual(res.body.success, false);
      const errorMsg = Array.isArray(res.body.error) ? res.body.error.join(' ') : res.body.error;
      assert.ok(errorMsg.includes('2 decimal places'));

      // Verify no products were created
      const getRes = await request(app).get('/products').expect(200);
      assert.strictEqual(getRes.body.data.length, 0);
    });

    test('rejects batch with invalid category', async () => {
      const payload = [
        { name: 'Product', sku: 'CAT-TEST-1', price: 10, category: 'electronics' },
        { name: 'Product', sku: 'CAT-TEST-2', price: 20, category: 'invalid-category' }
      ];

      const res = await request(app)
        .post('/products/bulk')
        .send(payload)
        .expect(400);

      assert.strictEqual(res.body.success, false);
      const errorMsg = Array.isArray(res.body.error) ? res.body.error.join(' ') : res.body.error;
      assert.ok(errorMsg.includes('category must be one of'));

      // Verify no products were created
      const getRes = await request(app).get('/products').expect(200);
      assert.strictEqual(getRes.body.data.length, 0);
    });
  });
});
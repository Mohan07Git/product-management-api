import { test, describe } from 'node:test';
import assert from 'node:assert';
import { validateCreate, validateUpdate, validateFilters } from '../src/validators/productValidator.js';

function createMockReq(body = {}, query = {}, params = {}) {
  return { body, query, params };
}

function createMockRes() {
  const res = {};
  res.status = function() { return res; };
  res.json = function() { return res; };
  return res;
}

async function runMiddleware(middlewares, req, res) {
  for (const middleware of middlewares) {
    try {
      await new Promise((resolve, reject) => {
        const next = (err) => {
          if (err) return reject(err);
          resolve();
        };
        try {
          const result = middleware(req, res, next);
          if (result && typeof result.then === 'function') {
            result.then(resolve).catch(reject);
          }
        } catch (e) {
          reject(e);
        }
      });
    } catch (err) {
      return { error: err };
    }
  }
  return { success: true };
}

describe('validateCreate', () => {
  test('passes with valid required fields', async () => {
    const req = createMockReq({
      name: 'Valid Product',
      sku: 'VALID-001',
      price: 29.99
    });
    const res = createMockRes();
    const result = await runMiddleware([...validateCreate], req, res);
    assert.strictEqual(result.success, true);
  });

  test('passes with all optional fields', async () => {
    const req = createMockReq({
      name: 'Full Product',
      sku: 'FULL-001',
      description: 'A description',
      category: 'electronics',
      price: 99.99,
      stock: 10,
      status: 'inactive'
    });
    const res = createMockRes();
    const result = await runMiddleware([...validateCreate], req, res);
    assert.strictEqual(result.success, true);
  });

  test('fails when name is missing', async () => {
    const req = createMockReq({ sku: 'TEST-001', price: 10 });
    const res = createMockRes();
    const result = await runMiddleware([...validateCreate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('name is required'));
    assert.strictEqual(result.error.statusCode, 400);
  });

  test('fails when name is empty string', async () => {
    const req = createMockReq({ name: '', sku: 'TEST-001', price: 10 });
    const res = createMockRes();
    const result = await runMiddleware([...validateCreate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('name cannot be empty'));
  });

  test('fails when sku is missing', async () => {
    const req = createMockReq({ name: 'Test', price: 10 });
    const res = createMockRes();
    const result = await runMiddleware([...validateCreate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('sku is required'));
  });

  test('fails when price is missing', async () => {
    const req = createMockReq({ name: 'Test', sku: 'TEST-001' });
    const res = createMockRes();
    const result = await runMiddleware([...validateCreate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('price is required'));
  });

  test('fails when price is not positive', async () => {
    const req = createMockReq({ name: 'Test', sku: 'TEST-001', price: -5 });
    const res = createMockRes();
    const result = await runMiddleware([...validateCreate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('price must be a positive number'));
  });

  test('fails when price has more than 2 decimals', async () => {
    const req = createMockReq({ name: 'Test', sku: 'TEST-001', price: 10.123 });
    const res = createMockRes();
    const result = await runMiddleware([...validateCreate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('price must have up to 2 decimal places'));
  });

  test('fails when category is invalid', async () => {
    const req = createMockReq({ name: 'Test', sku: 'TEST-001', price: 10, category: 'invalid' });
    const res = createMockRes();
    const result = await runMiddleware([...validateCreate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('category must be one of'));
  });

  test('fails when status is invalid', async () => {
    const req = createMockReq({ name: 'Test', sku: 'TEST-001', price: 10, status: 'invalid' });
    const res = createMockRes();
    const result = await runMiddleware([...validateCreate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('status must be one of'));
  });

  test('fails when stock is negative', async () => {
    const req = createMockReq({ name: 'Test', sku: 'TEST-001', price: 10, stock: -1 });
    const res = createMockRes();
    const result = await runMiddleware([...validateCreate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('stock must be a non-negative integer'));
  });

  test('fails when stock is not integer', async () => {
    const req = createMockReq({ name: 'Test', sku: 'TEST-001', price: 10, stock: 1.5 });
    const res = createMockRes();
    const result = await runMiddleware([...validateCreate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('stock must be a non-negative integer'));
  });
});

describe('validateUpdate', () => {
  // Valid UUID v4 (version 4 = '4' at position 14)
  const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

  test('passes with valid id and optional fields', async () => {
    const req = createMockReq(
      { name: 'Updated', price: 39.99 },
      {},
      { id: VALID_UUID }
    );
    const res = createMockRes();
    const result = await runMiddleware([...validateUpdate], req, res);
    assert.strictEqual(result.success, true);
  });

  test('fails when id is not a valid UUID', async () => {
    const req = createMockReq({ name: 'Test' }, {}, { id: 'invalid-id' });
    const res = createMockRes();
    const result = await runMiddleware([...validateUpdate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('id must be a valid UUID'));
  });

  test('fails when name is empty string', async () => {
    const req = createMockReq({ name: '' }, {}, { id: VALID_UUID });
    const res = createMockRes();
    const result = await runMiddleware([...validateUpdate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('name cannot be empty'));
  });

  test('allows partial update (only some fields)', async () => {
    const req = createMockReq({ price: 49.99 }, {}, { id: VALID_UUID });
    const res = createMockRes();
    const result = await runMiddleware([...validateUpdate], req, res);
    assert.strictEqual(result.success, true);
  });

  test('fails when price has more than 2 decimals', async () => {
    const req = createMockReq({ price: 10.123 }, {}, { id: VALID_UUID });
    const res = createMockRes();
    const result = await runMiddleware([...validateUpdate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('price must have up to 2 decimal places'));
  });

  test('fails when price is not positive', async () => {
    const req = createMockReq({ price: -5 }, {}, { id: VALID_UUID });
    const res = createMockRes();
    const result = await runMiddleware([...validateUpdate], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('price must be a positive number'));
  });
});

describe('validateFilters', () => {
  test('passes with valid filters', async () => {
    const req = createMockReq({}, {
      category: 'electronics',
      status: 'active',
      minPrice: '10',
      maxPrice: '100',
      inStock: 'true',
      search: 'test'
    });
    const res = createMockRes();
    const result = await runMiddleware([...validateFilters], req, res);
    assert.strictEqual(result.success, true);
  });

  test('passes with no filters', async () => {
    const req = createMockReq({}, {});
    const res = createMockRes();
    const result = await runMiddleware([...validateFilters], req, res);
    assert.strictEqual(result.success, true);
  });

  test('fails when category is invalid', async () => {
    const req = createMockReq({}, { category: 'invalid' });
    const res = createMockRes();
    const result = await runMiddleware([...validateFilters], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('category must be one of'));
  });

  test('fails when status is invalid', async () => {
    const req = createMockReq({}, { status: 'invalid' });
    const res = createMockRes();
    const result = await runMiddleware([...validateFilters], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('status must be one of'));
  });

  test('fails when minPrice is negative', async () => {
    const req = createMockReq({}, { minPrice: '-10' });
    const res = createMockRes();
    const result = await runMiddleware([...validateFilters], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('minPrice must be a non-negative number'));
  });

  test('fails when maxPrice is negative', async () => {
    const req = createMockReq({}, { maxPrice: '-10' });
    const res = createMockRes();
    const result = await runMiddleware([...validateFilters], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('maxPrice must be a non-negative number'));
  });

  test('fails when inStock is not boolean', async () => {
    const req = createMockReq({}, { inStock: 'yes' });
    const res = createMockRes();
    const result = await runMiddleware([...validateFilters], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('inStock must be true or false'));
  });

  test('fails when search is not a string', async () => {
    const req = createMockReq({}, { search: 123 });
    const res = createMockRes();
    const result = await runMiddleware([...validateFilters], req, res);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('search must be a string'));
  });
});
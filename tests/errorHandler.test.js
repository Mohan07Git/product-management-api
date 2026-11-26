import { test, describe } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import request from 'supertest';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';

const app = express();
app.use(express.json());

// Test routes to trigger different error paths
app.get('/trigger-validation-error', (req, res, next) => {
  const err = new Error('Validation failed');
  err.name = 'ValidationError';
  next(err);
});

app.get('/trigger-syntax-error', (req, res, next) => {
  const err = new Error('Unexpected token');
  err.name = 'SyntaxError';
  err.status = 400;
  err.body = {};
  next(err);
});

app.get('/trigger-generic-error', (req, res, next) => {
  next(new Error('Something went wrong'));
});

app.get('/trigger-status-code-error', (req, res, next) => {
  const err = new Error('Custom error');
  err.statusCode = 422;
  err.errors = ['field1 invalid', 'field2 invalid'];
  next(err);
});

app.use(notFoundHandler);
app.use(errorHandler);

describe('errorHandler', () => {
  test('handles ValidationError', async () => {
    const res = await request(app).get('/trigger-validation-error').expect(400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'Validation failed');
  });

  test('handles SyntaxError with status 400 and body', async () => {
    const res = await request(app).get('/trigger-syntax-error').expect(400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'Invalid JSON payload');
  });

  test('handles error with statusCode', async () => {
    const res = await request(app).get('/trigger-status-code-error').expect(422);
    assert.strictEqual(res.body.success, false);
    assert.ok(Array.isArray(res.body.error));
    assert.strictEqual(res.body.error.length, 2);
  });

  test('handles generic error as 500', async () => {
    const res = await request(app).get('/trigger-generic-error').expect(500);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'Internal server error');
  });
});

describe('notFoundHandler', () => {
  test('returns 404 for unknown route', async () => {
    const res = await request(app).get('/unknown-route').expect(404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'Route not found');
  });
});
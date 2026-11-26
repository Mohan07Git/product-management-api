# Product Management API

A RESTful API for managing product catalog data with support for CRUD operations, filtering, search, soft-archive (delete/restore), and SKU-based lookups. Built with Express.js using ES modules and an in-memory data store.

---

## Prerequisites

- **Node.js v20+** (tested on v20.11.0)
- **npm v10+**

> The project uses Node's built-in test runner (`node --test`) which requires Node 18+.

---

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd product-management-api

# Install dependencies
npm install
```

---

## Running the Server

```bash
# Development (auto-reload on changes)
npm run dev

# Production
npm start
```

Server starts on **http://localhost:3000** (configurable via `PORT` env var).

---

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage
```

> **Note:** Tests require Node 20+. If your system Node is older, run with the Node 20 binary directly:
> ```bash
> /path/to/node-v20/bin/node --test tests/**/*.test.js
> /path/to/node-v20/bin/node --test --experimental-test-coverage tests/**/*.test.js
> ```

---

## API Endpoints

| Method | Path | Description | Example curl |
|--------|------|-------------|--------------|
| `GET` | `/products` | List all non-archived products with optional filters | `curl "http://localhost:3000/products?category=electronics&inStock=true"` |
| `GET` | `/products/:id` | Get a single product by UUID | `curl "http://localhost:3000/products/123e4567-e89b-42d3-a456-426614174000"` |
| `POST` | `/products` | Create a new product | `curl -X POST http://localhost:3000/products -H "Content-Type: application/json" -d '{"name":"Wireless Headphones","sku":"WH-1000","price":199.99,"category":"electronics","stock":50,"description":"Noise-cancelling over-ear headphones"}'` |
| `POST` | `/products/bulk` | Create multiple products in one request | `curl -X POST http://localhost:3000/products/bulk -H "Content-Type: application/json" -d '[{"name":"Headphones","sku":"WH-1000","price":199.99},{"name":"Speaker","sku":"SP-2000","price":299.99}]'` |
| `PATCH` | `/products/:id` | Partially update a product | `curl -X PATCH http://localhost:3000/products/123e4567-e89b-42d3-a456-426614174000 -H "Content-Type: application/json" -d '{"price":179.99,"stock":45}'` |
| `DELETE` | `/products/:id` | Soft-archive a product (sets `archivedAt`) | `curl -X DELETE http://localhost:3000/products/123e4567-e89b-42d3-a456-426614174000` |
| `DELETE` | `/products/:id/restore` | Restore an archived product | `curl -X DELETE http://localhost:3000/products/123e4567-e89b-42d3-a456-426614174000/restore` |

---

## Query Parameters for `GET /products`

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `category` | string | Exact match: `electronics`, `clothing`, `food`, `books`, `other` | `?category=electronics` |
| `status` | string | Exact match: `active`, `inactive`, `discontinued` | `?status=active` |
| `minPrice` | number | Minimum price (inclusive) | `?minPrice=50` |
| `maxPrice` | number | Maximum price (inclusive) | `?maxPrice=500` |
| `inStock` | boolean | `true` = stock > 0, `false` = stock === 0 | `?inStock=true` |
| `search` | string | Case-insensitive substring match on `name` or `description` | `?search=wireless` |

**Combine multiple filters:** `?category=electronics&minPrice=100&inStock=true&search=headphones`

---

## Product Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID v4) | Auto-generated | Unique identifier (server-generated) |
| `name` | string | Yes | Product name (1-255 chars, trimmed) |
| `sku` | string | Yes | Stock Keeping Unit — must be unique (1-64 chars, trimmed) |
| `description` | string | No | Product description (trimmed, defaults to empty string) |
| `category` | string | No | One of: `electronics`, `clothing`, `food`, `books`, `other` (default: `other`) |
| `price` | number | Yes | Positive number, max 2 decimal places |
| `stock` | integer | No | Non-negative integer (default: `0`) |
| `status` | string | No | One of: `active`, `inactive`, `discontinued` (default: `active`) |
| `createdAt` | string (ISO 8601) | Auto-generated | Timestamp when product was created |
| `archivedAt` | string (ISO 8601) \| null | Auto-managed | `null` if active; ISO timestamp if soft-archived |

---

## Project Structure

```
product-management-api/
├── package.json
├── README.md
├── src/
│   ├── index.js                 # Entry point
│   ├── app.js                   # Express app factory
│   ├── controllers/
│   │   └── productController.js # Request handlers (7 endpoints)
│   ├── models/
│   │   └── product.js           # In-memory data model (Map + SKU index)
│   ├── routes/
│   │   └── products.js          # Route definitions + validation middleware
│   ├── validators/
│   │   └── productValidator.js  # express-validator rules
│   └── middleware/
│       ├── catchAsync.js        # Async error wrapper
│       └── errorHandler.js      # Centralized error responses
└── tests/
    ├── product.model.test.js    # Model unit tests (43 tests)
    ├── product.validator.test.js # Validator unit tests (28 tests)
    ├── products.routes.test.js  # API integration tests (33 tests)
    └── errorHandler.test.js     # Error handling tests (5 tests)
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.19.2 | Web framework |
| `express-validator` | ^6.14.0 | Request validation |
| `uuid` | ^14.0.3 | UUID v4 generation |
| `zod` | ^4.6.7 | Schema validation (MCP integration) |
| `@modelcontextprotocol/sdk` | ^1.32.2 | MCP server/client support |

| Dev Dependency | Version | Purpose |
|----------------|---------|---------|
| `supertest` | ^7.3.2 | HTTP API testing |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |

Example:
```bash
PORT=8080 NODE_ENV=production npm start
```

---

## Contributing

1. Fork the repository and create a feature branch.
2. Write tests for new functionality (target >95% coverage).
3. Run `npm test` and `npm run test:coverage` to verify.
4. Ensure JSDoc comments are added for new exported functions.
5. Submit a pull request with a clear description of changes.

---

## License

MIT License — see [LICENSE](LICENSE) for details.
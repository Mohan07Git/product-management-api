# Research Notes: Product Management API Patterns

## 1. Model Method Structure (`src/models/product.js`)

- **Export pattern**: Named export `productModel` object containing all public methods
- **Internal helpers**: Defined as standalone functions outside the exported object (`validateProduct`, `isArchived`, `filterArchived`, `addToIndexes`, `removeFromIndexes`, `updateIndexes`)
- **Storage**: Primary `Map` (`products`) + secondary indexes (`skuIndex`, `categoryIndex`, `statusIndex`) for O(1) lookups
- **Method signature**: JSDoc with `@param`, `@returns`, `@throws`, `@status` tags
- **Error handling**: Validation errors throw `Error` with `statusCode` and `errors` (string[]) properties; "not found" returns `null`/`false` — never throws
- **Soft-delete**: `archivedAt` timestamp; archived records excluded from queries but retained in store
- **Testing helper**: `_clear()` method (underscore prefix = internal) resets all stores

## 2. Validator Export/Import (`src/validators/productValidator.js`)

- **Export pattern**: Named exports for each validator array: `validateCreate`, `validateUpdate`, `validateFilters`, `validateBulkCreate`
- **Implementation**: `express-validator` chains (`body`, `query`, `param`) with `.withMessage()` for custom errors
- **Shared error handler**: `handleValidationErrors` collects `validationResult`, formats messages, passes to `next(error)` with `statusCode=400` and `errors` array
- **Constants**: Imports `VALID_CATEGORIES`, `VALID_STATUSES` from `../constants.js` for enum validation
- **Custom validation**: Price decimal precision via `.custom()` validator

## 3. Controller → Model Calls (`src/controllers/productController.js`)

- **Import**: `import { productModel } from '../models/product.js'`
- **Async handlers**: All controller functions are `async (req, res, next)`
- **Wrapping**: Each handler wrapped with `catchAsync` from middleware (exported as `productController` object)
- **Response helper**: Local `createResponse(success, data, error)` builds the envelope `{ success, data?, error? }`
- **Model calls**: Direct synchronous calls — `productModel.findAll(filters)`, `productModel.create(req.body)`, `productModel.update(id, req.body)`, `productModel.delete(id)`, `productModel.restore(id)`, `productModel.bulkCreate(req.body)`
- **404 handling**: Checks for `null`/`false` return from model, sends 404 with envelope

## 4. Route Imports (`src/routes/products.js`)

- **Imports**:
  - `Router` from `'express'`
  - `productController` from `'../controllers/productController.js'` (named export)
  - Validators from `'../validators/productValidator.js'` (named imports: `validateCreate`, `validateUpdate`, `validateFilters`, `validateBulkCreate`)
- **Middleware order**: Validators applied **before** controller methods: `router.get('/', validateFilters, productController.getAll)`
- **Export**: Default export of the configured `router`
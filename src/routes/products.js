import { Router } from 'express';
import { productController } from '../controllers/productController.js';
import { validateCreate, validateUpdate, validateFilters, validateBulkCreate } from '../validators/productValidator.js';

const router = Router();

router.get('/', validateFilters, productController.getAll);
router.get('/:id', productController.getById);
router.post('/', validateCreate, productController.create);
router.post('/bulk', validateBulkCreate, productController.bulkCreate);
router.patch('/:id', validateUpdate, productController.update);
router.delete('/:id', productController.delete);
router.delete('/:id/restore', productController.restore);

export default router;
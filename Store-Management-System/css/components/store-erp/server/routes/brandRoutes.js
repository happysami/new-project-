const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { buildLookupController } = require('../controllers/lookupControllerFactory');

const router = express.Router();
const controller = buildLookupController({ table: 'brands', moduleName: 'brands' });

router.use(authenticate);
router.get('/', authorize('products.view'), controller.list);
router.post('/', authorize('products.create'), controller.create);
router.put('/:id', authorize('products.update'), controller.update);
router.delete('/:id', authorize('products.delete'), controller.remove);

module.exports = router;

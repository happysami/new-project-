const express = require('express');
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadProductImage } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.get('/alerts/summary', authorize('products.view'), productController.alertsSummary);
router.get('/', authorize('products.view'), productController.listProducts);
router.get('/:id', authorize('products.view'), productController.getProduct);
router.post('/', authorize('products.create'), uploadProductImage.single('image'), productController.createProduct);
router.put('/:id', authorize('products.update'), uploadProductImage.single('image'), productController.updateProduct);
router.delete('/:id', authorize('products.delete'), productController.deleteProduct);

module.exports = router;

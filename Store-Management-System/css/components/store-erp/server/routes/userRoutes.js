const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, authorize('users.manage'));

router.get('/', userController.listUsers);
router.get('/:id', userController.getUser);

router.post(
  '/',
  [
    body('fullName').notEmpty().withMessage('Full name is required.'),
    body('email').isEmail().withMessage('A valid email is required.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('roleId').isInt().withMessage('A valid role is required.'),
  ],
  validate,
  userController.createUser
);

router.put('/:id', userController.updateUser);
router.patch('/:id/deactivate', userController.deactivateUser);
router.patch('/:id/activate', userController.activateUser);

module.exports = router;

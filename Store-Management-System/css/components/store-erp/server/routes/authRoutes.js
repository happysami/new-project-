const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().withMessage('A valid email is required.'), body('password').notEmpty().withMessage('Password is required.')],
  validate,
  authController.login
);

router.post('/refresh', authController.refresh);

router.post('/logout', authenticate, authController.logout);

router.get('/me', authenticate, authController.me);

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().withMessage('A valid email is required.')],
  validate,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  [body('token').notEmpty(), body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')],
  validate,
  authController.resetPassword
);

router.post(
  '/change-password',
  authenticate,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 })],
  validate,
  authController.changePassword
);

module.exports = router;

const express = require('express');
const { register, login, logout, refreshToken, updateFcmToken } = require('./auth.controller');
const {
  registerValidator,
  loginValidator,
  fcmTokenValidator,
} = require('./auth.validator');
const authMiddleware = require('../../middleware/authMiddleware');
const validate = require('../../middleware/validate');

const router = express.Router();

router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.post('/refresh', refreshToken); // optional: validate refreshToken field
router.post('/logout', authMiddleware, logout);
router.patch('/fcm-token', authMiddleware, fcmTokenValidator, validate, updateFcmToken);

module.exports = router;
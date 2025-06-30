const express = require('express');
const multer = require('multer');
const { uploadAttachment } = require('./attachment.controller');
const authMiddleware = require('../../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post('/upload', authMiddleware, upload.single('file'), uploadAttachment);

module.exports = router;

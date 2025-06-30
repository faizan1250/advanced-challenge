const express = require('express');
const { createCategory, getCategories, updateCategory, deleteCategory } = require('./category.controller');
const { categoryValidator } = require('./category.validator');
const validate = require('../../middleware/validate');
const authMiddleware = require('../../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', categoryValidator, validate, createCategory);
router.get('/', getCategories);
router.patch('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;

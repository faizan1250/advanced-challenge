const { body } = require('express-validator');

exports.categoryValidator = [
  body('name').notEmpty().withMessage('Category name is required'),
];

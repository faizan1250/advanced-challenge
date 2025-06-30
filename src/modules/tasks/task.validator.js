const { body } = require('express-validator');

exports.taskValidator = [
  body('title').notEmpty().withMessage('Title is required'),

  body('repeatRule')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Invalid repeat rule'),

  body('reminderTime')
    .optional()
    .custom((value) => {
      const time = new Date(value);
      if (isNaN(time.getTime())) throw new Error('Invalid reminderTime');
      if (time < new Date()) throw new Error('reminderTime must be in the future');
      return true;
    }),
];

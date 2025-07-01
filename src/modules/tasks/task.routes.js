const express = require('express');
const { createTask, getTasks, updateTask, deleteTask } = require('./task.controller');
const { toggleStarred, uploadAttachment, completeSharedTask } = require('./task.controller');
const { taskValidator } = require('./task.validator');
const authMiddleware = require('../../middleware/authMiddleware');
const isParticipant = require('../../middleware/isTaskParticipantOrOwner');
const validate = require('../../middleware/validate');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });


const router = express.Router();

router.use(authMiddleware);

router.post('/', taskValidator, validate, createTask);
router.get('/', getTasks);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/starred', toggleStarred);
router.post('/:id/attachments', upload.single('file'), uploadAttachment);
router.post('/:id/complete', isParticipant, completeSharedTask);

module.exports = router;

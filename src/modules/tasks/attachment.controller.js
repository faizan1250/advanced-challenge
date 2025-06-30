const { bucket } = require('../../config/firebase');
const Attachment = require('./attachment.model');
const { v4: uuidv4 } = require('uuid');

exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const blob = bucket.file(`attachments/${uuidv4()}-${req.file.originalname}`);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on('error', (err) => res.status(500).json({ error: err.message }));

    blobStream.on('finish', async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      const attachment = await Attachment.create({
        userId: req.user.id,
        taskId: req.body.taskId,
        fileName: req.file.originalname,
        fileUrl: publicUrl,
        contentType: req.file.mimetype,
      });

      res.status(201).json(attachment);
    });

    blobStream.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
};

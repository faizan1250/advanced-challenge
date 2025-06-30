jest.mock('./src/queues/reminderQueue', () => ({
  add: jest.fn(),
  remove: jest.fn(), // <-- add this
}));


// ✅ Mock Firebase upload
jest.mock('./src/config/firebase', () => ({
  uploadToFirebase: jest.fn().mockResolvedValue({
    downloadURL: 'https://fake.url/attachment.png',
    filePath: 'attachments/test.png',
  }),
}));
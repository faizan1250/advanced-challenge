require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');
const Task = require('../../src/modules/tasks/task.model');
const User = require('../../src/modules/auth/auth.model');

jest.mock('../../src/queues/reminderQueue', () => ({
  add: jest.fn()
}));

const reminderQueue = require('../../src/queues/reminderQueue');

const mongoUrl = process.env.MONGOTEST_URI;

let token;

beforeAll(async () => {
  await mongoose.connect(mongoUrl);
  await User.deleteMany({});
  await Task.deleteMany({});

  await request(app).post('/api/auth/register').send({
    name: 'Queue Test',
    email: 'queue@test.com',
    password: '12345678'
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'queue@test.com',
    password: '12345678'
  });

  token = loginRes.body.accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
});

test('should enqueue a reminder job when reminderTime is provided', async () => {
  const futureTime = new Date(Date.now() + 5 * 60000); // 5 mins later

  const res = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Reminder Queue Test Task',
      reminderTime: futureTime
    });

  expect(res.status).toBe(201);
  expect(reminderQueue.add).toHaveBeenCalledWith(
    'sendReminder',
    expect.objectContaining({
      userId: expect.any(String),
      taskId: expect.anything(),
      title: 'Reminder Queue Test Task',
      reminderTime: futureTime.toISOString()
    }),
    expect.objectContaining({
      delay: expect.any(Number),
      jobId: expect.stringMatching(/^reminder-/),
      attempts: 3
    })
  );
});

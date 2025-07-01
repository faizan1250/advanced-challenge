require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Task = require('../../src/modules/tasks/task.model');
const User = require('../../src/modules/auth/auth.model');

let token;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGOTEST_URI);
  await User.deleteMany({});
  await Task.deleteMany({});

  // Register the user first
  await request(app).post('/api/auth/register').send({
    name: 'Reminder User',
    email: 'reminder@test.com',
    password: '12345678',
  });

  // Then log in
  const res = await request(app).post('/api/auth/login').send({
    email: 'reminder@test.com',
    password: '12345678'
  });

  token = res.body.accessToken;
  if (!token) {
    throw new Error('❌ Login failed — token not received');
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});

test('should create a task with reminder fields', async () => {
  const reminderTime = new Date(Date.now() + 3600000); // 1 hour later

  const res = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Reminder Test Task',
      hasReminder: true,
      reminderTime
    });

  expect(res.status).toBe(201);
  expect(res.body.task.title).toBe('Reminder Test Task');
  expect(res.body.task.hasReminder).toBe(true);
  expect(new Date(res.body.task.reminderTime)).toEqual(new Date(reminderTime));
});

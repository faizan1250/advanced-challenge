const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Task = require('../src/modules/tasks/task.model');
const User = require('../src/modules/auth/auth.model');
require('dotenv').config();

let userId;
let token;
let userEmail;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGOTEST_URI);

  await User.deleteMany({});
  await Task.deleteMany({});

  userEmail = `cronuser${Date.now()}@example.com`;

  const res = await request(app).post('/api/auth/register').send({
    name: 'Cron User',
    email: userEmail,
    password: 'password123',
  });

  const login = await request(app).post('/api/auth/login').send({
    email: userEmail,
    password: 'password123',
  });

  token = login.body.accessToken;

  const user = await User.findOne({ email: userEmail });
  userId = user._id;
});



afterEach(async () => {
  await Task.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('⏰ Recurring Task Cron Logic', () => {
  it('should generate repeated task if dueDate passed and repeatRule is valid', async () => {
    const task = await Task.create({
      title: 'Daily Task',
      userId,
      dueDate: new Date(Date.now() - 86400000), // yesterday
      repeatRule: 'daily',
    });

    const res = await request(app)
  .post('/api/cron/repeat-tasks')
  .set('Authorization', `Bearer ${token}`)
  .set('x-cron-secret', process.env.CRON_SECRET);

    expect(res.statusCode).toBe(200);
    expect(res.body.generated).toBe(1);

    const repeated = await Task.findOne({ createdFrom: task._id });
    expect(repeated).toBeDefined();
    expect(repeated.isCompleted).toBe(false);
  });

  it('should skip task if next dueDate exceeds repeatUntil', async () => {
    await Task.create({
      title: 'Expired Repeat',
      userId,
      dueDate: new Date(Date.now() - 3* 86400000),
      repeatRule: 'daily',
   repeatUntil : new Date(Date.now() - 3 * 86400000) // earlier than newDueDate
    });

    const res = await request(app)
  .post('/api/cron/repeat-tasks')
  .set('Authorization', `Bearer ${token}`)
  .set('x-cron-secret', process.env.CRON_SECRET);

    expect(res.body.generated).toBe(0);
  });

  it('should skip task if repeatRule is unknown', async () => {
    await Task.create({
      title: 'Unknown Rule',
      userId,
      dueDate: new Date(Date.now() - 86400000),
      repeatRule: 'yearly',
    });

    const res = await request(app)
  .post('/api/cron/repeat-tasks')
  .set('Authorization', `Bearer ${token}`)
  .set('x-cron-secret', process.env.CRON_SECRET);

    expect(res.body.generated).toBe(0);
  });

  it('should skip task if dueDate is in future', async () => {
    await Task.create({
      title: 'Future Task',
      userId,
      dueDate: new Date(Date.now() + 86400000),
      repeatRule: 'daily',
    });

    const res = await request(app)
  .post('/api/cron/repeat-tasks')
  .set('Authorization', `Bearer ${token}`)
  .set('x-cron-secret', process.env.CRON_SECRET);

    expect(res.body.generated).toBe(0);
  });

  it('should skip task if repeatRule is missing', async () => {
    await Task.create({
      title: 'No Repeat',
      userId,
      dueDate: new Date(Date.now() - 86400000),
    });

    const res = await request(app)
  .post('/api/cron/repeat-tasks')
  .set('Authorization', `Bearer ${token}`)
  .set('x-cron-secret', process.env.CRON_SECRET);

    expect(res.body.generated).toBe(0);
  });
});

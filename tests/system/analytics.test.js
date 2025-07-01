// tests/system/analytics.test.js
require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/modules/auth/auth.model');
const Task = require('../../src/modules/tasks/task.model');
const Analytics = require('../../src/modules/analytics/analyticsSnapshot.model');

const mongoUrl = process.env.MONGOTEST_URI;
const CRON_SECRET = process.env.CRON_SECRET;

describe('📊 Analytics Snapshot Cron', () => {
  beforeAll(async () => {
    await mongoose.connect(mongoUrl);
    await User.deleteMany({});
    await Task.deleteMany({});
    await Analytics.deleteMany({});

    const user = await User.create({ name: 'Ana', email: 'ana@test.com', password: '12345678' });

    await Task.create([
      { title: 'Done Task', userId: user._id, isCompleted: true },
      { title: 'Pending Task', userId: user._id, isCompleted: false }
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should generate daily analytics snapshot', async () => {
    const res = await request(app)
      .post('/api/cron/analytics-snapshot')
      .set('x-cron-secret', CRON_SECRET)
      .send();

    expect(res.status).toBe(200);
expect(res.body.message).toMatch(/snapshot complete/i);


  const snapshots = await Analytics.find();
expect(snapshots.length).toBeGreaterThan(0);
expect(snapshots[0]).toHaveProperty('tasksCompleted');
expect(snapshots[0]).toHaveProperty('minutesFocused');
expect(snapshots[0]).toHaveProperty('xpEarned');

  });
});

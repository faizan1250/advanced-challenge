require('dotenv').config();
jest.setTimeout(20000); // 20 seconds

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');

const User = require('../../src/modules/auth/auth.model');
const Analytics = require('../../src/modules/analytics/analyticsSnapshot.model');

const mongoUrl = process.env.MONGOTEST_URI;
const CRON_SECRET = process.env.CRON_SECRET;

describe('🏆 Monthly Leaderboard Awards Cron', () => {
  beforeAll(async () => {
    await mongoose.connect(mongoUrl);
    await User.deleteMany({});
    await Analytics.deleteMany({});

    // Seed users with XP
    await User.create([
      { name: 'TopUser', email: 'top@x.com', password: '12345678', challengeProgress: [], xp: 300 },
      { name: 'MidUser', email: 'mid@x.com', password: '12345678', challengeProgress: [], xp: 200 },
      { name: 'LowUser', email: 'low@x.com', password: '12345678', challengeProgress: [], xp: 100 },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

 test('should assign awards to top users', async () => {
  const res = await request(app)
    .post('/api/cron/monthly-awards')
    .set('x-cron-secret', process.env.CRON_SECRET)
    .send();

  expect(res.status).toBe(200);
  expect(res.body.message).toMatch(/awards/i);

  const users = await User.find().sort({ 'gamifiedStats.xp': -1 });

  // Check bonus XP and win increment
  expect(users[0].gamifiedStats.xp).toBe(100); // base was 0, +100
  expect(users[0].monthlyWins).toBe(1);

  expect(users[1].gamifiedStats.xp).toBe(100);
  expect(users[1].monthlyWins).toBe(1);

  expect(users[2].monthlyWins || 0).toBe(0); // third user shouldn’t get win
});
});

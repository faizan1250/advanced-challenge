require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../../src/modules/auth/auth.model');
const Challenge = require('../../src/modules/challenges/challenge.model');
const Session = require('../../src/modules/challenges/session.model');
const { stopSession } = require('../../src/modules/challenges/session.controller');
const httpMocks = require('node-mocks-http');

const mongoUrl = process.env.MONGOTEST_URI || 'mongodb://127.0.0.1:27017/advanced-test';

beforeAll(async () => {
  await mongoose.connect(mongoUrl);
  await User.deleteMany({});
  await Challenge.deleteMany({});
  await Session.deleteMany({});
});

afterAll(() => mongoose.disconnect());

test('challenge XP and progress is updated after stopping session', async () => {
  const user = await User.create({ name: 'Test', email: 'test@test.com', password: '12345678' });

  const challenge = await Challenge.create({
    title: '30 min challenge',
    goalTime: 30,
    durationDays: 5,
    rewardPoints: 100,
    createdBy: user._id,
    participants: [user._id],
  });

  const session = await Session.create({
    userId: user._id,
    challengeId: challenge._id,
    startedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
  });

  const req = httpMocks.createRequest({
    method: 'POST',
    params: { id: challenge._id },
    user: { id: user._id },
  });
  const res = httpMocks.createResponse();

  await stopSession(req, res);
  const data = res._getJSONData();

  expect(res.statusCode).toBe(200);
  expect(data.duration).toBe(20);

  const updated = await User.findById(user._id);
  const progress = updated.challengeProgress.find(p => p.challengeId.toString() === challenge._id.toString());

  expect(progress).toBeDefined();
  expect(progress.totalMinutes).toBeGreaterThanOrEqual(20);
  expect(progress.totalXP).toBeGreaterThanOrEqual(20);
});

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../../src/modules/auth/auth.model');
const { awardXP } = require('../../src/modules/leaderboard/xp.service');
const moment = require('moment');
jest.setTimeout(20000); // 20 seconds

const mongoUrl = process.env.MONGOTEST_URI || 'mongodb://127.0.0.1:27017/advanced-test';
beforeAll(async () => {
  console.log('🌐 Attempting MongoDB connect to:', mongoUrl);

  await mongoose.connect(mongoUrl, {
    serverSelectionTimeoutMS: 10000, // 🔧 force timeout if can't reach server
  });

  console.log('✅ Connected to MongoDB');
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

test('awards XP and starts a new streak', async () => {
  const user = await User.create({ name: 'XP', email: 'x@test.com', password: '12345678' });

  await awardXP(user._id, 20);
  const updated = await User.findById(user._id);

  expect(updated.gamifiedStats.xp).toBe(20);
  expect(updated.gamifiedStats.streak).toBe(1);
});

test('maintains streak if completed on next day', async () => {
  const user = await User.create({
    name: 'Streak Test',
    email: 'streak@test.com',
    password: '12345678',
    gamifiedStats: {
      xp: 0,
      streak: 1,
      lastCompletedDate: moment().subtract(1, 'day').toDate()
    }
  });

  await awardXP(user._id, 10);
  const updated = await User.findById(user._id);
  expect(updated.gamifiedStats.streak).toBe(2);
});

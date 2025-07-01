require('dotenv').config();
const io = require('socket.io-client');
const http = require('http');
const mongoose = require('mongoose');
const app = require('../../src/app');
const setupSocketServer = require('../../src/sockets/gateway');
const User = require('../../src/modules/auth/auth.model');
const Challenge = require('../../src/modules/challenges/challenge.model');
const Session = require('../../src/modules/challenges/session.model');

const mongoUrl = process.env.MONGOTEST_URI;
let server, socket;

let user, challenge;

beforeAll(async () => {
  await mongoose.connect(mongoUrl);
  await User.deleteMany({});
  await Challenge.deleteMany({});
  await Session.deleteMany({});

  user = await User.create({ name: 'WS Leader', email: 'leader@test.com', password: '12345678' });

  challenge = await Challenge.create({
    title: 'Leaderboard WS',
    goalTime: 30,
    durationDays: 5,
    createdBy: user._id,
    participants: [user._id]
  });

  await Session.create({
    challengeId: challenge._id,
    userId: user._id,
    startedAt: new Date(Date.now() - 5 * 60000)
  });

  server = http.createServer(app);
  setupSocketServer(server);
  await server.listen(5020);

  socket = io('http://localhost:5020', {
    query: { userId: user._id.toString() },
    transports: ['websocket']
  });

  await new Promise(resolve => socket.on('connect', resolve));
});

afterAll(async () => {
  socket.disconnect();
  await mongoose.disconnect();
  await server.close();
});

test('should emit CHALLENGE_LEADERBOARD_UPDATED after stopping session', done => {
  socket.on('CHALLENGE_LEADERBOARD_UPDATED', payload => {
    try {
  expect(payload.challengeId).toBe(challenge._id.toString());
expect(payload.leaderboard[0]).toHaveProperty('totalXP');
expect(payload.leaderboard[0]).toHaveProperty('totalMinutes');
expect(payload.leaderboard[0].user).toHaveProperty('name');
      done();
    } catch (err) {
      done(err);
    }
  });

  const stop = require('../../src/modules/challenges/session.controller').stopSession;

  setTimeout(() => {
    stop(
      { params: { id: challenge._id }, user: { id: user._id } },
      { status: () => ({ json: () => {} }) }
    );
  }, 300);
});

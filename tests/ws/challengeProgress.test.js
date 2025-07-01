require('dotenv').config();
const io = require('socket.io-client');
const http = require('http');
const app = require('../../src/app');
const setupSocketServer = require('../../src/sockets/gateway');
const mongoose = require('mongoose');
const User = require('../../src/modules/auth/auth.model');
const Challenge = require('../../src/modules/challenges/challenge.model');
const Session = require('../../src/modules/challenges/session.model');

const mongoUrl = process.env.MONGOTEST_URI || 'mongodb://127.0.0.1:27017/advanced-test';

let server, socketClient;
let user, challenge;

beforeAll(async () => {
  await mongoose.connect(mongoUrl);
  await User.deleteMany({});
  await Challenge.deleteMany({});
  await Session.deleteMany({});

  user = await User.create({ name: 'WS User', email: 'ws@test.com', password: '12345678' });

  challenge = await Challenge.create({
    title: 'Live Challenge',
    goalTime: 15,
    durationDays: 2,
    createdBy: user._id,
    participants: [user._id]
  });

  await Session.create({
    challengeId: challenge._id,
    userId: user._id,
    startedAt: new Date(Date.now() - 10 * 60000),
  });

  server = http.createServer(app);
  setupSocketServer(server);
  await server.listen(5010);

  socketClient = io('http://localhost:5010', {
    query: { userId: user._id.toString() },
    transports: ['websocket'],
  });

  await new Promise(resolve => socketClient.on('connect', resolve));
});

afterAll(async () => {
  socketClient.disconnect();
  await mongoose.disconnect();
  await server.close();
});

test('should emit CHALLENGE_PROGRESS on stop', done => {
  socketClient.on('CHALLENGE_PROGRESS', payload => {
    try {
      expect(payload.challengeId).toBe(challenge._id.toString());
      expect(payload.userId).toBe(user._id.toString());
      expect(payload.earnedXP).toBeGreaterThanOrEqual(10);
      done();
    } catch (e) {
      done(e);
    }
  });

  // simulate stop request (fixed with await in a separate tick)
  const sessionController = require('../../src/modules/challenges/session.controller');

  // ensure Redis and socket have time to react
  setTimeout(async () => {
    await sessionController.stopSession(
      { params: { id: challenge._id }, user: { id: user._id } },
      { status: () => ({ json: () => {} }) }
    );
  }, 200); // slight delay gives time for listener setup
});


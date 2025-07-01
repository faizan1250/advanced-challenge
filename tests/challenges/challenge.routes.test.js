require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const http = require('http');
const app = require('../../src/app');
const setupSocketServer = require('../../src/sockets/gateway');
const User = require('../../src/modules/auth/auth.model');
const Challenge = require('../../src/modules/challenges/challenge.model');
const Session = require('../../src/modules/challenges/session.model');

let server, token, user, challengeId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGOTEST_URI);
  await User.deleteMany({});
  await Challenge.deleteMany({});
  await Session.deleteMany({});

  // Start server with WebSocket
  server = http.createServer(app);
  setupSocketServer(server);
  await server.listen(5020);

  // Register + login user
  await request(app).post('/api/auth/register').send({
    name: 'Test',
    email: 'test@challenge.com',
    password: '12345678'
  });

  const login = await request(app).post('/api/auth/login').send({
    email: 'test@challenge.com',
    password: '12345678'
  });

  token = login.body.accessToken;
  user = await User.findOne({ email: 'test@challenge.com' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await server.close();
});

test('should create a challenge', async () => {
  const res = await request(app)
    .post('/api/challenges')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Focus Boost',
      goalTime: 30,
      durationDays: 5
    });

  console.log('CREATE RESPONSE:', res.body); // 👈 Add this line

  expect(res.status).toBe(201);
  challengeId = res.body.challenge._id; // this is currently failing
});

test('should join a challenge', async () => {
  const res = await request(app)
    .post(`/api/challenges/${challengeId}/join`)
    .set('Authorization', `Bearer ${token}`)
    .send();

  expect(res.status).toBe(200);
  expect(res.body.message).toMatch(/joined/i);
});

test('should start a challenge session', async () => {
  const res = await request(app)
    .post(`/api/challenges/${challengeId}/start`)
    .set('Authorization', `Bearer ${token}`)
    .send();

  expect(res.status).toBe(201);
  expect(res.body.sessionId).toBeDefined();
});

test('should stop a challenge session', async () => {
  // Delay to simulate session time
  await new Promise(resolve => setTimeout(resolve, 1000));
await Session.updateOne({ challengeId }, {
  startedAt: new Date(Date.now() - 2 * 60 * 1000) // started 2 minutes ago
});
  const res = await request(app)
    .post(`/api/challenges/${challengeId}/stop`)
    .set('Authorization', `Bearer ${token}`)
    .send();

  expect(res.status).toBe(200);
  expect(res.body.duration).toBeGreaterThanOrEqual(1);
});

test('should return leaderboard for challenge', async () => {
  const res = await request(app)
    .get(`/api/challenges/${challengeId}/leaderboard`)
    .set('Authorization', `Bearer ${token}`)
    .send();

  expect(res.status).toBe(200);
  expect(res.body).toBeInstanceOf(Array);
  expect(res.body[0]).toHaveProperty('userId');
  expect(res.body[0]).toHaveProperty('totalXP');
});
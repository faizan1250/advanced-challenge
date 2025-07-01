require('dotenv').config();

const mongoose = require('mongoose');
const io = require('socket.io-client');
const request = require('supertest');
const app = require('../../src/app');
const http = require('http');
const setupSocketServer = require('../../src/sockets/gateway');
const User = require('../../src/modules/auth/auth.model');
const FocusSession = require('../../src/modules/focus/focus.model');
const Redis = require('ioredis');

jest.setTimeout(20000);

let server, clientSocket, clientUser, token;
const redisUrl = process.env.REDIS_URL;
const mongoUrl = process.env.MONGOTEST_URI || 'mongodb://127.0.0.1:27017/advanced-test';
const pub = new Redis(redisUrl, { tls: {}, maxRetriesPerRequest: null });

beforeAll(async () => {
  console.log('🔌 Connecting to MongoDB:', mongoUrl);
  await mongoose.connect(mongoUrl);
  await User.deleteMany({});
  await FocusSession.deleteMany({});

  server = http.createServer(app);
  setupSocketServer(server);
  await server.listen(5002);

  await request(app).post('/api/auth/register').send({
    name: 'Focus User',
    email: 'focus@example.com',
    password: '12345678'
  });

  const login = await request(app).post('/api/auth/login').send({
    email: 'focus@example.com',
    password: '12345678'
  });

  token = login.body.accessToken;
  clientUser = await User.findOne({ email: 'focus@example.com' });

  clientSocket = io('http://localhost:5002', {
    query: { userId: clientUser._id.toString() },
    reconnectionDelay: 0,
    forceNew: true,
    transports: ['websocket']
  });
});

afterAll(async () => {
  if (clientSocket?.disconnect) clientSocket.disconnect();
  if (pub?.quit) await pub.quit();
  if (server?.close) await server.close();
  await mongoose.disconnect();
});

test('should start and end focus session with WebSocket events', async () => {
  return new Promise(async (resolve, reject) => {
    try {
      let receivedStart = false;

      clientSocket.on('FOCUS_STARTED', async (startPayload) => {
        receivedStart = true;
        expect(startPayload.taskId).toBeUndefined();
        expect(startPayload.sessionId).toBeDefined();

        // Simulate 6 minutes delay
        await new Promise(r => setTimeout(r, 100));

        const res = await request(app)
          .post('/api/focus/end')
          .set('Authorization', `Bearer ${token}`)
          .send({ sessionId: startPayload.sessionId });

        expect(res.body.session.durationMinutes).toBeGreaterThanOrEqual(0);
      });

      clientSocket.on('FOCUS_ENDED', (endPayload) => {
        expect(endPayload.earnedXP).toBeGreaterThanOrEqual(0);
        expect(receivedStart).toBe(true);
        resolve();
      });

      await request(app)
        .post('/api/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({});
    } catch (err) {
      reject(err);
    }
  });
});

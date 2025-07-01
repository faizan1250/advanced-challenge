// 📁 tests/ws/taskUpdated.test.js
require('dotenv').config();

const mongoose = require('mongoose');
const io = require('socket.io-client');
const request = require('supertest');
const app = require('../../src/app');
const http = require('http');
const setupSocketServer = require('../../src/sockets/gateway');
const User = require('../../src/modules/auth/auth.model');
const Task = require('../../src/modules/tasks/task.model');
const Redis = require('ioredis');

jest.setTimeout(20000); // ⏱️ Increase timeout for setup

let server, clientSocket, clientUser, token;
const redisUrl = process.env.REDIS_URL;
const mongoUrl = process.env.MONGOTEST_URI || 'mongodb://127.0.0.1:27017/advanced-test';
const pub = new Redis(redisUrl, { tls: {}, maxRetriesPerRequest: null });

beforeAll(async () => {
  console.log('🔌 Connecting to MongoDB:', mongoUrl);
  console.log('🔌 Connecting to Redis:', redisUrl);

  await mongoose.connect(mongoUrl);

  server = http.createServer(app);
  setupSocketServer(server);
  await server.listen(5001);

  await User.deleteMany({});
  await Task.deleteMany({});

  await request(app).post('/api/auth/register').send({
    name: 'WS Test',
    email: 'ws@example.com',
    password: '12345678'
  });

  const login = await request(app).post('/api/auth/login').send({
    email: 'ws@example.com',
    password: '12345678'
  });

  token = login.body.accessToken;
  clientUser = await User.findOne({ email: 'ws@example.com' });

  clientSocket = io('http://localhost:5001', {
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

test('should emit TASK_UPDATED when completing a shared task', () => {
  return new Promise(async (resolve, reject) => {
    try {
      const task = await Task.create({
        title: 'WS Shared',
        userId: clientUser._id,
        participants: [clientUser._id],
      });

      clientSocket.on('TASK_UPDATED', (payload) => {
        try {
          expect(payload.taskId).toBe(task._id.toString());
          expect(payload.type).toBe('completed');
          expect(payload.userId).toBe(clientUser._id.toString());
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      await request(app)
        .post(`/api/tasks/${task._id}/complete`)
        .set('Authorization', `Bearer ${token}`);
    } catch (err) {
      reject(err);
    }
  });
});

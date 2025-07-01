require('dotenv').config();
const http = require('http');
const io = require('socket.io-client');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../src/app');
const setupSocketServer = require('../../src/sockets/gateway');
const Task = require('../../src/modules/tasks/task.model');
const User = require('../../src/modules/auth/auth.model');

jest.setTimeout(20000);

const redisUrl = process.env.REDIS_URL;
const mongoUrl = process.env.MONGOTEST_URI || 'mongodb://127.0.0.1:27017/advanced-test';

let server, socketA, socketB, userA, userB, tokenA;

beforeAll(async () => {
  await mongoose.connect(mongoUrl);
  await User.deleteMany({});
  await Task.deleteMany({});

  server = http.createServer(app);
  setupSocketServer(server);
  await server.listen(5003);

  // Register + login two users
  await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@test.com', password: '12345678' });
  await request(app).post('/api/auth/register').send({ name: 'B', email: 'b@test.com', password: '12345678' });

  const loginA = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: '12345678' });
  tokenA = loginA.body.accessToken;

  userA = await User.findOne({ email: 'a@test.com' });
  userB = await User.findOne({ email: 'b@test.com' });

  // Create a shared task
  const task = await Task.create({
    title: 'Leaderboard Test',
    userId: userA._id,
    participants: [userA._id, userB._id]
  });

  // Connect both users via WebSocket
  socketA = io('http://localhost:5003', { query: { userId: userA._id.toString() }, transports: ['websocket'] });
  socketB = io('http://localhost:5003', { query: { userId: userB._id.toString() }, transports: ['websocket'] });

  return new Promise(resolve => setTimeout(resolve, 500)); // allow sockets to connect
});

afterAll(async () => {
  if (socketA?.disconnect) socketA.disconnect();
  if (socketB?.disconnect) socketB.disconnect();
  if (server?.close) await server.close();
  await mongoose.disconnect();
});

test('should emit leaderboard update to all participants when someone completes task', async () => {
  return new Promise(async (resolve, reject) => {
    socketB.on('TASK_LEADERBOARD_UPDATED', (payload) => {
      try {
        expect(payload).toHaveProperty('taskId');
        expect(payload.leaderboard).toBeInstanceOf(Array);
        expect(payload.leaderboard[0].userId).toBe(userA._id.toString());
        expect(payload.leaderboard[0].earnedXP).toBe(10);
        return resolve();
      } catch (err) {
        return reject(err);
      }
    });

    // Complete the task as user A
    const task = await Task.findOne({ title: 'Leaderboard Test' });
    await request(app)
      .post(`/api/tasks/${task._id}/complete`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send();
  });
});

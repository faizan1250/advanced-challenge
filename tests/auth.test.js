const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/modules/auth/auth.model');
require('dotenv').config();

// 🧪 Prevent Redis issues in test env
jest.mock('../src/queues/reminderQueue', () => ({
  add: jest.fn(),
}));

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGOTEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  await User.deleteMany({});
});

// Utility: Create test user with dynamic email
const createTestUser = async (override = {}) => {
  const email = override.email || `user${Date.now()}@example.com`;
  const password = override.password || '12345678';
  const name = override.name || 'Test User';

  await request(app).post('/api/auth/register').send({ name, email, password });
  return { email, password };
};

describe('Auth Routes', () => {
  it('should register a user', async () => {
    const email = `test${Date.now()}@example.com`;
    const password = '12345678';

    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email,
      password,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('User registered successfully');
  });

  it('should reject registration without name', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'noname@example.com',
      password: '12345678',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].msg).toBe('Name is required');
  });

  it('should login a user and return tokens', async () => {
    const { email, password } = await createTestUser();

    const res = await request(app).post('/api/auth/login').send({ email, password });

    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('should reject invalid login', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'wrong',
    });

    expect(res.statusCode).toBe(401);
  });

  it('should refresh token', async () => {
    const { email, password } = await createTestUser();

    const loginRes = await request(app).post('/api/auth/login').send({ email, password });

    const res = await request(app).post('/api/auth/refresh').send({
      token: loginRes.body.refreshToken,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('should reject registration with invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'not-an-email',
      password: '123456',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].msg).toBe('Valid email is required');
  });

  it('should reject registration with short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'valid@example.com',
      password: '123',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].msg).toBe('Password must be at least 6 characters');
  });

  it('should reject login with empty password', async () => {
    const { email } = await createTestUser();

    const res = await request(app).post('/api/auth/login').send({
      email,
      password: '',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].msg).toBe('Password is required');
  });

  it('should reject login with invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'invalid-email',
      password: 'password123',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].msg).toBe('Valid email is required');
  });

  it('should reject missing FCM token', async () => {
    const { email, password } = await createTestUser({ email: 'fcmtest@example.com' });

    const loginRes = await request(app).post('/api/auth/login').send({ email, password });

    const res = await request(app)
      .patch('/api/auth/fcm-token')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].msg).toBe('FCM token is required');
  });
});

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/modules/auth/auth.model');
const Task = require('../src/modules/tasks/task.model');
require('dotenv').config();


// ✅ Mock Firebase upload

// ✅ Prevent Redis errors during tests
jest.mock('../src/queues/reminderQueue', () => ({
  add: jest.fn(),
}));

let token;
let userId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGOTEST_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await User.deleteMany({});
  await Task.deleteMany({});

  await request(app).post('/api/auth/register').send({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  });

  const res = await request(app).post('/api/auth/login').send({
    email: 'test@example.com',
    password: 'password123',
  });

  token = res.body.accessToken;
  const user = await User.findOne({ email: 'test@example.com' });
  userId = user._id;
});

afterAll(async () => {
  await mongoose.connection.close();
});

afterEach(async () => {
  await Task.deleteMany({});
});

describe('Task API', () => {
    const reminderQueue = require('../src/queues/reminderQueue');

describe('⏰ Task Reminders', () => {
  beforeEach(() => {
    reminderQueue.add.mockClear(); // reset mock calls
  });

  test('should schedule reminder if reminderTime is provided', async () => {
    const reminderTime = new Date(Date.now() + 5 * 60 * 1000); // +5 min

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Reminder Test',
        reminderTime,
      });

    expect(res.statusCode).toBe(201);
    expect(reminderQueue.add).toHaveBeenCalledTimes(1);

   const [name, payload, options] = reminderQueue.add.mock.calls[0];
   expect(name).toBe('sendReminder');
    expect(payload.title).toBe('Reminder Test');
    expect(new Date(payload.reminderTime)).toEqual(reminderTime);
    expect(options.delay).toBeGreaterThan(0);
  });

  test('should not schedule reminder if reminderTime is missing', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'No Reminder' });

    expect(res.statusCode).toBe(201);
    expect(reminderQueue.add).not.toHaveBeenCalled();
  });
});

  describe('POST /api/tasks', () => {
    test('should create a basic task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Task 1' });

      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('Task 1');
      expect(res.body.userId).toBe(userId.toString());
    });

    test('should create a task with subtasks and reminder', async () => {
      const reminderTime = new Date(Date.now() + 60000); // +1 min
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Complex Task',
          reminderTime,
          subtasks: [{ title: 'Sub 1' }, { title: 'Sub 2' }],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.subtasks).toHaveLength(2);
      expect(new Date(res.body.reminderTime).toISOString()).toBe(reminderTime.toISOString());
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 60 * 60 * 1000); // +1hr

      await Task.insertMany([
        { title: 'Starred', userId, isStarred: true },
        { title: 'Completed', userId, isCompleted: true },
        { title: 'Work', userId, category: 'Work' },
        { title: 'Old Due', userId, dueDate: new Date('2024-01-01') },
        { title: 'Recent Due', userId, dueDate: futureDate },
      ]);
    });

    test('should filter by isStarred', async () => {
      const res = await request(app)
        .get('/api/tasks?isStarred=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Starred');
    });

    test('should filter by isCompleted', async () => {
      const res = await request(app)
        .get('/api/tasks?isCompleted=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Completed');
    });

    test('should filter by category', async () => {
      const res = await request(app)
        .get('/api/tasks?category=Work')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.length).toBe(1);
      expect(res.body[0].category).toBe('Work');
    });

    test('should filter by dueDate range', async () => {
      const now = new Date();
      const res = await request(app)
        .get(`/api/tasks?from=${now.toISOString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Recent Due');
    });

    test('should filter by updatedSince (offline sync)', async () => {
      const now = new Date();
      await Task.create({ title: 'Sync Me', userId, updatedAt: now });

      const res = await request(app)
        .get(`/api/tasks?updatedSince=${now.toISOString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.some(t => t.title === 'Sync Me')).toBe(true);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    let task;

    beforeEach(async () => {
      task = await Task.create({ title: 'Original', userId });
    });

    test('should update task title', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      expect(res.body.title).toBe('Updated');
    });

    test('should toggle isStarred', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${task._id}/starred`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.isStarred).toBe(true);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    test('should delete a task', async () => {
      const task = await Task.create({ title: 'To Delete', userId });

      const res = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      const deleted = await Task.findById(task._id);
      expect(deleted).toBeNull();
    });
  });
  
});

describe('Notes per Task', () => {
  test('should create a task with notes', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Task with notes',
        notes: 'This is an important note.',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.notes).toBe('This is an important note.');
  });

  test('should update task notes', async () => {
    const task = await Task.create({ title: 'Editable', userId });

    const res = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Updated note content.' });

    expect(res.statusCode).toBe(200);
    expect(res.body.notes).toBe('Updated note content.');
  });
});


describe('📅 Calendar View', () => {
const startOfDay = date => new Date(date.setHours(0, 0, 0, 0));

beforeEach(async () => {
  const now = new Date();
  const today = startOfDay(new Date(now));
  const tomorrow = new Date(today.getTime() + 86400000);
  const nextWeek = new Date(today.getTime() + 7 * 86400000);

  await Task.insertMany([
    { title: 'Today Task', userId, dueDate: today },
    { title: 'Tomorrow Task', userId, dueDate: tomorrow },
    { title: 'Next Week Task', userId, dueDate: nextWeek },
  ]);
});

  it('should return tasks within date range', async () => {
    const today = startOfDay(new Date());
  const from = today;
  const to = new Date(today.getTime() + 2 * 86400000); // today + tomorrow

  const res = await request(app)
    .get(`/api/tasks?from=${from.toISOString()}&to=${to.toISOString()}`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(200);
  const titles = res.body.map(t => t.title);
  expect(titles).toContain('Today Task');
  expect(titles).toContain('Tomorrow Task');
  expect(titles).not.toContain('Next Week Task');
  });
});



it('should reject update if incoming updatedAt is older', async () => {
  const task = await Task.create({
    title: 'Sync Task',
    userId,
  });

  // Simulate a new update happened on the server
  await Task.findByIdAndUpdate(task._id, { title: 'Updated Server Title' });

  const staleUpdatedAt = new Date(Date.now() - 10_000); // 10 seconds ago

  const res = await request(app)
    .patch(`/api/tasks/${task._id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Stale Client Title',
      updatedAt: staleUpdatedAt,
    });

  expect(res.statusCode).toBe(409);
  expect(res.body.error).toMatch(/conflict/i);
});

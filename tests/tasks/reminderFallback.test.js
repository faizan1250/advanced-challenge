jest.mock('../../src/sockets/pub', () => ({
  emitToUser: jest.fn(),
}));

const { emitToUser } = require('../../src/sockets/pub');
const User = require('../../src/modules/auth/auth.model');

let mockedProcessor;
jest.mock('bullmq', () => ({
  Worker: jest.fn((queueName, processor) => {
    mockedProcessor = processor;
    return { on: jest.fn() };
  }),
}));

require('../../src/worker/reminderWorker'); // Sets up processor

describe('🔔 reminderWorker fallback WebSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should emit REMINDER_PUSH via WebSocket if no FCM token', async () => {
    User.findById = jest.fn().mockResolvedValue({
      _id: 'user123',
      fcmToken: null, // no token
    });

    const job = {
      data: {
        userId: 'user123',
        title: 'Fallback Task',
        taskId: 'task456',
      },
    };

    await mockedProcessor(job);

    expect(emitToUser).toHaveBeenCalledWith('user123', 'REMINDER_PUSH', {
      message: 'Reminder: Fallback Task',
      taskId: 'task456',
    });
  });
});

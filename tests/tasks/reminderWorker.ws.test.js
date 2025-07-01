require('dotenv').config();

let mockedProcessor;
let mockEmitToUser;

jest.mock('bullmq', () => ({
  Worker: jest.fn((queueName, processor) => {
    mockedProcessor = processor;
    return { on: jest.fn() };
  }),
}));

jest.mock('../../src/sockets/pub', () => {
  mockEmitToUser = jest.fn();
  return {
    emitToUser: mockEmitToUser,
  };
});

jest.mock('../../src/modules/auth/auth.model', () => ({
  findById: jest.fn(),
}));

const User = require('../../src/modules/auth/auth.model');
const { REMINDER_PUSH } = require('../../src/sockets/events');

require('../../src/worker/reminderWorker'); // triggers Worker setup

describe('🔔 reminderWorker fallback WebSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should emit REMINDER_PUSH if user has no FCM token', async () => {
    const userId = 'user456';
    const job = {
      data: {
        userId,
        title: 'Fallback Task',
        taskId: 'task456',
      },
    };

    User.findById.mockResolvedValue({
      _id: userId,
      fcmToken: null,
    });

    await mockedProcessor(job);

    expect(mockEmitToUser).toHaveBeenCalledWith(userId, REMINDER_PUSH, {
      message: 'Reminder: Fallback Task',
      taskId: 'task456',
    });
  });
});


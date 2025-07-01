require('dotenv').config();

let mockedProcessor;
let sendMock; // <-- no assignment here, just declaration

const mockedWorkerInstance = {
  on: jest.fn(),
};

jest.mock('bullmq', () => ({
  Worker: jest.fn((queueName, processor) => {
    mockedProcessor = processor;
    return mockedWorkerInstance;
  }),
}));

jest.mock('../../src/config/firebase', () => {
  const localSendMock = jest.fn(); // define inside
  sendMock = localSendMock; // assign to outer variable
  return {
    admin: {
      messaging: () => ({
        send: localSendMock,
      }),
    },
  };
});

const User = require('../../src/modules/auth/auth.model');
require('../../src/worker/reminderWorker'); // triggers Worker setup

describe('🔔 reminderWorker', () => {
  beforeEach(() => {
    sendMock.mockClear();
    User.findById = jest.fn().mockResolvedValue({
      _id: '123',
      fcmToken: 'mock_token',
    });
  });

  it('should send FCM push notification for reminder', async () => {
    const job = {
      data: { userId: '123', title: 'Mock Task Title' },
    };

    await mockedProcessor(job);

    expect(sendMock).toHaveBeenCalledWith({
      token: 'mock_token',
      notification: {
        title: 'Task Reminder',
        body: 'Mock Task Title',
      },
    });
  });

  it('should skip if no FCM token', async () => {
    User.findById.mockResolvedValueOnce(null);

    const job = { data: { userId: 'no-token', title: 'Another Task' } };
    await mockedProcessor(job);

    expect(sendMock).not.toHaveBeenCalled();
  });
});

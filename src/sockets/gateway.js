const { Server } = require('socket.io');
const Redis = require('ioredis');
const events = require('./events');

// ✅ Use TLS for Upstash
const redisOptions = { tls: {} };
console.log('🔗 Connecting to Redis:', process.env.REDIS_URL);

const pub = new Redis(process.env.REDIS_URL, redisOptions);
const sub = new Redis(process.env.REDIS_URL, redisOptions);

// Optional: log Redis errors without crashing
pub.on('error', err => console.error('Redis Pub Error:', err));
sub.on('error', err => console.error('Redis Sub Error:', err));

function setupSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  io.on('connection', socket => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(userId);
      console.log(`✅ User connected to WebSocket: ${userId}`);
    }
  });

  // Subscribe to Redis event channels
  Object.values(events).forEach(event => {
    sub.subscribe(event);
  });

  sub.on('message', (channel, message) => {
    try {
      const { userId, payload } = JSON.parse(message);
      io.to(userId).emit(channel, payload);
    } catch (err) {
      console.error(`❌ Invalid Redis message on ${channel}:`, err);
    }
  });

  return io;
}

module.exports = setupSocketServer;

const Redis = require('ioredis');
console.log('🔗 Connecting to Redis:', process.env.REDIS_URL);

const pub = new Redis(process.env.REDIS_URL, { tls: {} });

pub.on('error', err => console.error('Redis Pub Error:', err));

function emitToUser(userId, event, payload) {
  console.log(`📡 Publishing ${event} to user ${userId}`);
  pub.publish(event, JSON.stringify({ userId, payload }));
}

module.exports = { emitToUser };

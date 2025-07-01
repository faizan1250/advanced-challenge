
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  // Connection Settings
  connectTimeout: 30000, // Increased to 30s
  maxRetriesPerRequest: null, // Disable retry limit
  enableReadyCheck: true, // Better connection state tracking
  autoResubscribe: true, // Maintain pub/sub channels on reconnect
  lazyConnect: false, // Connect immediately
  tls: {}, // Required for Upstash
  retryStrategy: (times) => {
    console.log(`Redis retry attempt ${times}`);
    return Math.min(times * 500, 5000); // Max 5s delay
  }
});

// Connection Event Handlers
redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('ready', () => console.log('⚡ Redis ready for commands'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));
redis.on('reconnecting', (ms) => console.log(`🔁 Redis reconnecting in ${ms}ms`));
redis.on('end', () => console.log('🔌 Redis connection closed'));

// Proactive Health Monitoring

  setInterval(async () => {
    try {
      await redis.ping();
      console.log('🏓 Redis ping successful');
    } catch (err) {
      console.warn('Redis ping failed:', err.message);
    }
  }, 60000);



module.exports = redis;
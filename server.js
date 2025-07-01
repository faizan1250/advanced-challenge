require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectMongo = require('./src/config/mongo');
const setupSocketServer = require('./src/sockets/gateway');

const PORT = process.env.PORT || 8080;

// Create a raw HTTP server from the Express app
const server = http.createServer(app);

// Setup Socket.IO + Redis
setupSocketServer(server);

// Connect to Mongo and start the server
connectMongo().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 HTTP + WebSocket server running on http://localhost:${PORT}`);
  });
});

require('dotenv').config();
const app = require('./src/app');
const connectMongo = require('./src/config/mongo');

const PORT = process.env.PORT || 8080;

connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});

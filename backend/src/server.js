require('dotenv').config();
const { createServer } = require('http');
const app = require('./app');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

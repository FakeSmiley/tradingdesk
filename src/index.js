require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    try {
      const prisma = require('./lib/prisma.js');
      await prisma.$connect();
      console.log('✅ Database connected');
    } catch (dbErr) {
      console.warn('⚠️ Database connection warning:', dbErr.message);
    }

    app.listen(PORT, () => {
      console.log(`🚀 FXDESK Backend running on http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;

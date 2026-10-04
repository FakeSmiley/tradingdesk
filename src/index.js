require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Database connected');

    // Run seed if needed
    const { seedDatabase } = require('./services/seed');
    await seedDatabase(prisma);
    prisma.$disconnect();

    app.listen(PORT, () => {
      console.log(`🚀 FXDESK Backend running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;

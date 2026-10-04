require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();

// ─── SECURITY HEADERS ───────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ─── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── BODY PARSING ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── LOGGING ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── RATE LIMITING ─────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── STATIC FILES ──────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── ROUTES ────────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/users',          require('./routes/users'));
app.use('/api/dashboard',      require('./routes/dashboard'));
app.use('/api/checklist',      require('./routes/checklist'));
app.use('/api/prices',         require('./routes/prices'));
app.use('/api/paper-trading',  require('./routes/paperTrading'));
app.use('/api/risk-manager',   require('./routes/riskManager'));
app.use('/api/strategy',       require('./routes/strategy'));
app.use('/api/order-flow',     require('./routes/orderFlow'));
app.use('/api/training',       require('./routes/tradingTraining'));
app.use('/api/analysis',       require('./routes/analysis'));
app.use('/api/journal',        require('./routes/journal'));
app.use('/api/analytics',      require('./routes/analytics'));
app.use('/api/news',           require('./routes/news'));
app.use('/api/courses',        require('./routes/courses'));
app.use('/api/credits',        require('./routes/credits'));
app.use('/api/points',         require('./routes/points'));
app.use('/api/leaderboard',    require('./routes/leaderboard'));
app.use('/api/affiliate',      require('./routes/affiliate'));
app.use('/api/community',      require('./routes/community'));
app.use('/api/profile',        require('./routes/profile'));
app.use('/api/brokers',        require('./routes/brokers'));
app.use('/api/tips',           require('./routes/tips'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/withdrawals',    require('./routes/withdrawals'));
app.use('/api/features',       require('./routes/features'));

// ─── ADMIN ROUTES ──────────────────────────────────────────────
app.use('/api/admin',          require('./routes/admin/index'));

// ─── HEALTH CHECK ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── ERROR HANDLER ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ─── START SERVER ──────────────────────────────────────────────
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

// Start the server only when this file is executed directly (local dev).
if (require.main === module) {
  startServer();
}

module.exports = app;

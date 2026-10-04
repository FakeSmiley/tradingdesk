require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const { generalLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const dashboardRouter = require('./routes/dashboard');
const checklistRouter = require('./routes/checklist');
const pricesRouter = require('./routes/prices');
const paperTradingRouter = require('./routes/paperTrading');
const riskManagerRouter = require('./routes/riskManager');
const strategyRouter = require('./routes/strategy');
const orderFlowRouter = require('./routes/orderFlow');
const tradingTrainingRouter = require('./routes/tradingTraining');
const analysisRouter = require('./routes/analysis');
const journalRouter = require('./routes/journal');
const analyticsRouter = require('./routes/analytics');
const newsRouter = require('./routes/news');
const coursesRouter = require('./routes/courses');
const creditsRouter = require('./routes/credits');
const pointsRouter = require('./routes/points');
const leaderboardRouter = require('./routes/leaderboard');
const affiliateRouter = require('./routes/affiliate');
const communityRouter = require('./routes/community');
const profileRouter = require('./routes/profile');
const brokersRouter = require('./routes/brokers');
const tipsRouter = require('./routes/tips');
const reportsRouter = require('./routes/reports');
const withdrawalsRouter = require('./routes/withdrawals');
const featuresRouter = require('./routes/features');
const adminRouter = require('./routes/admin/index');

const app = express();

// ─── SECURITY HEADERS ───────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

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
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/checklist', checklistRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/paper-trading', paperTradingRouter);
app.use('/api/risk-manager', riskManagerRouter);
app.use('/api/strategy', strategyRouter);
app.use('/api/order-flow', orderFlowRouter);
app.use('/api/training', tradingTrainingRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/journal', journalRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/news', newsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/credits', creditsRouter);
app.use('/api/points', pointsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/affiliate', affiliateRouter);
app.use('/api/community', communityRouter);
app.use('/api/profile', profileRouter);
app.use('/api/brokers', brokersRouter);
app.use('/api/tips', tipsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/withdrawals', withdrawalsRouter);
app.use('/api/features', featuresRouter);
app.use('/api/admin', adminRouter);

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

module.exports = app;

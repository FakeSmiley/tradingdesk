const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma.js');

const FEATURES = [
  'DASHBOARD', 'CHART', 'PAPER_TRADING', 'MY_STRATEGY', 'ORDER_FLOW_TRAINING',
  'TRADING_TRAINING', 'ANALYSIS', 'ICT_ANALYSIS', 'SMC_ANALYSIS',
  'RISK_PROFIT_MANAGER', 'SUPPLY_DEMAND', 'LIVE_FOREX_NEWS', 'TRADE_JOURNAL',
  'ANALYTICS', 'LEARNING_FX', 'FX_BROKERS', 'DAILY_CHECKLIST', 'LEADERBOARD',
  'COMMUNITY', 'COURSE_MARKETPLACE', 'AFFILIATE'
];

const DEFAULT_SETTINGS = [
  { key: 'siteName', value: 'FXDESK' },
  { key: 'trialEnabled', value: 'true' },
  { key: 'trialDuration', value: '14' },
  { key: 'trialCredits', value: '50' },
  { key: 'affiliateEnabled', value: 'true' },
  { key: 'affiliateCreditReward', value: '2' },
  { key: 'affiliatePointReward', value: '2' },
  { key: 'marketplaceEnabled', value: 'true' },
  { key: 'platformCommission', value: '10' },
  { key: 'withdrawalEnabled', value: 'true' },
  { key: 'minWithdrawal', value: '50' },
  { key: 'maxWithdrawal', value: '10000' },
  { key: 'withdrawalFee', value: '0' },
  { key: 'gnewsEnabled', value: 'true' },
  { key: 'newsRefreshInterval', value: '15' },
  { key: 'paperTradingEnabled', value: 'true' },
  { key: 'maxTradesPerDay', value: '10' },
  { key: 'dailyLossLimit', value: '1000' },
  { key: 'dailyProfitTarget', value: '2000' },
  { key: 'profitPointRate', value: '1' },
  { key: 'lossPointRate', value: '1' },
  { key: 'maxPointsPerTrade', value: '50' },
  { key: 'maxLossPoints', value: '50' },
  { key: 'dailyPointLimit', value: '500' },
  { key: 'checklistEnabled', value: 'true' },
  { key: 'checklistDefaultPoints', value: '1' },
  { key: 'communityEnabled', value: 'true' },
  { key: 'communityPremiumRequired', value: 'true' },
  { key: 'feedbackUrl', value: '' },
  { key: 'toolRequestUrl', value: '' },
  { key: 'reportFormUrl', value: '' },
  { key: 'maintenanceMode', value: 'false' },
];

const DEFAULT_CHECKLIST = [
  { name: 'Login Today', description: 'Login to your account', points: 1, taskType: 'LOGIN', displayOrder: 1 },
  { name: 'Review Chart', description: 'Analyze at least one currency pair', points: 2, taskType: 'CHART', displayOrder: 2 },
  { name: 'Complete Order Flow Training', description: 'Complete at least one Order Flow session', points: 3, taskType: 'ORDER_FLOW', displayOrder: 3 },
  { name: 'Write Trade Journal', description: 'Create a journal entry for today', points: 2, taskType: 'JOURNAL', displayOrder: 4 },
  { name: 'Complete Trading Training', description: 'Answer today\'s trading question', points: 5, taskType: 'TRAINING', displayOrder: 5 },
];

async function seedDatabase(prisma) {
  console.log('🌱 Seeding database...');

  // Admin user
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'FxDesk@Admin2024!',
      12
    );
    const admin = await prisma.user.create({
      data: {
        username: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@fxdesk.com',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        loginDays: 0
      }
    });
    await prisma.userCredits.create({ data: { userId: admin.id } });
    await prisma.userPoints.create({ data: { userId: admin.id } });
    await prisma.analytics.create({ data: { userId: admin.id } });
    console.log(`✅ Admin created: ${process.env.ADMIN_EMAIL || 'admin@fxdesk.com'}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'FxDesk@Admin2024!'}`);
    console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
  }

  // Default features
  for (const feature of FEATURES) {
    await prisma.featureAccess.upsert({
      where: { feature },
      create: { feature, isEnabled: true },
      update: {}
    });
  }

  // Default settings
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.adminSetting.upsert({
      where: { key: setting.key },
      create: setting,
      update: {}
    });
  }

  // Default checklist tasks
  const existingTasks = await prisma.checklistTask.count();
  if (existingTasks === 0) {
    for (const task of DEFAULT_CHECKLIST) {
      await prisma.checklistTask.create({ data: task });
    }
  }

  console.log('✅ Seed complete');
}

module.exports = { seedDatabase };

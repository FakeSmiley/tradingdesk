const prisma = require('../lib/prisma.js');

// ─── POINT ENGINE ──────────────────────────────────────────────
async function awardPoints(userId, amount, source, description = '') {
  if (amount <= 0) return;

  const settings = await getPointSettings();
  const today = new Date().toISOString().slice(0, 10);

  // Get or create user points
  let userPoints = await prisma.userPoints.findUnique({ where: { userId } });
  if (!userPoints) {
    userPoints = await prisma.userPoints.create({
      data: { userId }
    });
  }

  if (userPoints.isFrozen) return;

  // Daily limit check
  const dailyLimit = parseInt(settings.dailyPointLimit || '500');
  let dailyPoints = userPoints.dailyPoints;
  if (userPoints.dailyPointsDate !== today) {
    dailyPoints = 0;
  }

  const remaining = dailyLimit - dailyPoints;
  const toAward = Math.min(amount, remaining);
  if (toAward <= 0) return;

  // Update totals based on source
  const sourceKey = getSourceKey(source);
  await prisma.userPoints.update({
    where: { userId },
    data: {
      totalPoints: { increment: toAward },
      [sourceKey]: { increment: toAward },
      dailyPoints: userPoints.dailyPointsDate === today ? { increment: toAward } : toAward,
      dailyPointsDate: today
    }
  });

  // Create transaction
  await prisma.pointTransaction.create({
    data: {
      pointsId: userPoints.id,
      type: 'EARN',
      amount: toAward,
      source,
      description
    }
  });

  // Update leaderboard
  await updateLeaderboard(userId);
}

async function deductPoints(userId, amount, source, description = '') {
  if (amount <= 0) return;

  let userPoints = await prisma.userPoints.findUnique({ where: { userId } });
  if (!userPoints || userPoints.isFrozen) return;

  const settings = await getPointSettings();
  const maxLoss = parseInt(settings.maxLossPoints || '100');
  const toDeduct = Math.min(amount, maxLoss);

  const newTotal = Math.max(0, userPoints.totalPoints - toDeduct);

  await prisma.userPoints.update({
    where: { userId },
    data: {
      totalPoints: newTotal,
      tradingPoints: Math.max(0, userPoints.tradingPoints - toDeduct)
    }
  });

  await prisma.pointTransaction.create({
    data: {
      pointsId: userPoints.id,
      type: 'DEDUCT',
      amount: toDeduct,
      source,
      description
    }
  });

  await updateLeaderboard(userId);
}

async function updateLeaderboard(userId) {
  const userPoints = await prisma.userPoints.findUnique({ where: { userId } });
  if (!userPoints) return;

  await prisma.leaderboard.upsert({
    where: { userId },
    create: {
      userId,
      pointsId: userPoints.id,
      totalPoints: userPoints.totalPoints
    },
    update: {
      totalPoints: userPoints.totalPoints,
      updatedAt: new Date()
    }
  });

  // Recalculate ranks
  const allEntries = await prisma.leaderboard.findMany({
    orderBy: { totalPoints: 'desc' }
  });

  for (let i = 0; i < allEntries.length; i++) {
    await prisma.leaderboard.update({
      where: { id: allEntries[i].id },
      data: { rank: i + 1 }
    });
  }
}

function getSourceKey(source) {
  const map = {
    CHECKLIST: 'checklistPoints',
    TRADING: 'tradingPoints',
    TRAINING: 'trainingPoints',
    ORDERFLOW: 'trainingPoints',
    AFFILIATE: 'affiliatePoints',
    PAPER_TRADING: 'paperTradingPoints',
    BONUS: 'bonusPoints',
    ADMIN: 'bonusPoints'
  };
  return map[source] || 'bonusPoints';
}

async function getPointSettings() {
  const settings = await prisma.adminSetting.findMany({
    where: {
      key: {
        in: ['dailyPointLimit', 'maxPointsPerTrade', 'maxLossPoints', 'profitPointRate', 'lossPointRate']
      }
    }
  });
  const result = {};
  settings.forEach(s => { result[s.key] = s.value; });
  return result;
}

module.exports = { awardPoints, deductPoints, updateLeaderboard };

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/dashboard
router.get('/', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);
    const user = req.user;

    // Today's checklist
    const tasks = await prisma.checklistTask.findMany({ where: { status: 'ACTIVE' } });
    const completedToday = await prisma.checklistHistory.findMany({ where: { userId, date: today } });
    const checklistProgress = { completed: completedToday.length, total: tasks.length };

    // Today's tip
    const tip = await prisma.tip.findFirst({
      where: { status: 'PUBLISHED', OR: [{ expiryDate: null }, { expiryDate: { gte: today } }] },
      orderBy: { publishDate: 'desc' }
    });

    // Trading performance (today's closed paper trades)
    const todayTrades = await prisma.paperTrade.findMany({
      where: { userId, date: today, status: 'CLOSED' }
    });
    const wins = todayTrades.filter(t => t.pnl > 0).length;
    const losses = todayTrades.filter(t => t.pnl < 0).length;
    const totalPnl = todayTrades.reduce((s, t) => s + t.pnl, 0);
    const winRate = todayTrades.length > 0 ? ((wins / todayTrades.length) * 100).toFixed(1) : '0.0';

    // Continue training - last incomplete
    const lastLesson = await prisma.orderFlowLesson.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'asc' }
    });

    // Activity calendar (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const activity = await prisma.activityLog.findMany({
      where: { userId, createdAt: { gte: threeMonthsAgo } }
    });

    // Activity summary
    const allLogins = await prisma.activityLog.findMany({ where: { userId, type: 'LOGIN' } });
    const allTrading = await prisma.activityLog.findMany({ where: { userId, type: 'PAPER_TRADE' } });
    const allJournals = await prisma.activityLog.findMany({ where: { userId, type: 'JOURNAL' } });
    const allTraining = await prisma.activityLog.findMany({ where: { userId, type: 'TRAINING' } });

    // Recent activity (last 10)
    const recentActivity = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({
      user: {
        username: user.username,
        currentStreak: user.currentStreak,
        bestStreak: user.bestStreak,
        loginDays: user.loginDays,
        premium: user.premium,
        credits: user.credits,
        points: user.points
      },
      checklistProgress,
      tip,
      tradingPerformance: {
        total: todayTrades.length,
        wins,
        losses,
        winRate: parseFloat(winRate),
        pnl: parseFloat(totalPnl.toFixed(2))
      },
      continueTraining: lastLesson,
      activityCalendar: activity,
      activitySummary: {
        totalLoginDays: allLogins.length,
        totalTradingDays: [...new Set(allTrading.map(a => a.date))].length,
        winningDays: 0,
        losingDays: 0,
        trainingDays: [...new Set(allTraining.map(a => a.date))].length,
        journalDays: [...new Set(allJournals.map(a => a.date))].length,
        currentStreak: user.currentStreak,
        bestStreak: user.bestStreak
      },
      recentActivity
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

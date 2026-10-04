const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/analytics
router.get('/', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const trades = await prisma.paperTrade.findMany({ where: { userId, status: 'CLOSED' } });
    const journals = await prisma.journal.count({ where: { userId } });
    const trainingResults = await prisma.trainingResult.findMany({ where: { userId } });
    const orderFlowSessions = await prisma.orderFlowSession.findMany({ where: { userId } });
    const userPoints = await prisma.userPoints.findUnique({ where: { userId } });

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const totalProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const totalLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const winRate = trades.length > 0 ? (wins.length / trades.length * 100) : 0;
    const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.pnl)) : 0;
    const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.pnl)) : 0;

    // Training performance
    const trainingCorrect = trainingResults.filter(r => r.isCorrect).length;
    const trainingAccuracy = trainingResults.length > 0 ? (trainingCorrect / trainingResults.length * 100) : 0;

    // Order flow performance
    const avgAccuracy = orderFlowSessions.length > 0
      ? orderFlowSessions.reduce((s, x) => s + x.accuracy, 0) / orderFlowSessions.length
      : 0;

    res.json({
      trading: {
        total: trades.length,
        wins: wins.length,
        losses: losses.length,
        winRate: parseFloat(winRate.toFixed(1)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        totalLoss: parseFloat(totalLoss.toFixed(2)),
        netPnl: parseFloat((totalProfit - totalLoss).toFixed(2)),
        bestTrade: parseFloat(bestTrade.toFixed(2)),
        worstTrade: parseFloat(worstTrade.toFixed(2))
      },
      training: {
        questionsAnswered: trainingResults.length,
        correct: trainingCorrect,
        accuracy: parseFloat(trainingAccuracy.toFixed(1))
      },
      orderFlow: {
        sessions: orderFlowSessions.length,
        avgAccuracy: parseFloat(avgAccuracy.toFixed(1))
      },
      journalCount: journals,
      points: userPoints
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

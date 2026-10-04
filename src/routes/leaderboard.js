const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/leaderboard
router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [total, entries] = await Promise.all([
      prisma.leaderboard.count({ where: { isVisible: true, isFrozen: false } }),
      prisma.leaderboard.findMany({
        where: { isVisible: true, isFrozen: false },
        include: {
          user: { select: { username: true, avatarUrl: true } },
          points: { select: { checklistPoints: true, tradingPoints: true, trainingPoints: true, affiliatePoints: true, paperTradingPoints: true, bonusPoints: true } }
        },
        orderBy: { totalPoints: 'desc' },
        take: parseInt(limit),
        skip
      })
    ]);

    // Get current user rank
    const myEntry = await prisma.leaderboard.findUnique({
      where: { userId: req.user.id }
    });

    res.json({
      entries: entries.map(e => ({
        rank: e.rank,
        username: e.user.username,
        avatarUrl: e.user.avatarUrl,
        totalPoints: e.totalPoints,
        breakdown: e.points
      })),
      total,
      myRank: myEntry?.rank || null,
      myPoints: myEntry?.totalPoints || 0
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

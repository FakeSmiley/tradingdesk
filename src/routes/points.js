const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const prisma = require('../lib/prisma.js');

// GET /api/points/balance
router.get('/balance', auth, async (req, res, next) => {
  try {
    const points = await prisma.userPoints.findUnique({ where: { userId: req.user.id } });
    res.json({ points: points || { totalPoints: 0 } });
  } catch (error) { next(error); }
});

// GET /api/points/transactions
router.get('/transactions', auth, async (req, res, next) => {
  try {
    const points = await prisma.userPoints.findUnique({ where: { userId: req.user.id } });
    if (!points) return res.json({ transactions: [] });

    const transactions = await prisma.pointTransaction.findMany({
      where: { pointsId: points.id },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ transactions });
  } catch (error) { next(error); }
});

module.exports = router;

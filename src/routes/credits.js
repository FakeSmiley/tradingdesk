const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/credits/balance
router.get('/balance', auth, async (req, res, next) => {
  try {
    const credits = await prisma.userCredits.findUnique({ where: { userId: req.user.id } });
    res.json({ credits: credits || { normalCredits: 0, greenCredits: 0, pendingGreen: 0, withdrawableGreen: 0 } });
  } catch (error) { next(error); }
});

// GET /api/credits/transactions
router.get('/transactions', auth, async (req, res, next) => {
  try {
    const credits = await prisma.userCredits.findUnique({ where: { userId: req.user.id } });
    if (!credits) return res.json({ transactions: [] });

    const transactions = await prisma.creditTransaction.findMany({
      where: { creditsId: credits.id },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ transactions });
  } catch (error) { next(error); }
});

module.exports = router;

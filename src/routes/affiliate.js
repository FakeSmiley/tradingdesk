const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/affiliate/stats
router.get('/stats', auth, async (req, res, next) => {
  try {
    const referrals = await prisma.affiliateReferral.findMany({
      where: { referrerId: req.user.id },
      include: { referred: { select: { username: true, createdAt: true } } }
    });

    res.json({
      referralCode: req.user.username,
      referralLink: `${process.env.FRONTEND_URL}/register?ref=${req.user.username}`,
      total: referrals.length,
      completed: referrals.filter(r => r.isCompleted).length,
      creditsEarned: referrals.reduce((s, r) => s + r.creditsGiven, 0),
      pointsEarned: referrals.reduce((s, r) => s + r.pointsGiven, 0),
      referrals: referrals.map(r => ({
        username: r.referred?.username,
        date: r.createdAt,
        completed: r.isCompleted,
        creditsGiven: r.creditsGiven
      }))
    });
  } catch (error) { next(error); }
});

module.exports = router;

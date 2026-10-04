const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/profile — full profile
router.get('/', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        premium: true,
        trial: true,
        credits: true,
        points: true,
        sellerAccount: true
      }
    });

    const referralCode = user.username; // Use username as referral code
    const affiliateStats = await prisma.affiliateReferral.findMany({
      where: { referrerId: user.id }
    });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      loginMethod: user.loginMethod,
      loginDays: user.loginDays,
      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      avatarUrl: user.avatarUrl,
      premium: user.premium,
      trial: user.trial,
      credits: user.credits,
      points: user.points,
      sellerAccount: user.sellerAccount ? {
        accountType: user.sellerAccount.accountType,
        accountName: user.sellerAccount.accountName,
        maskedNumber: user.sellerAccount.maskedNumber,
        bankName: user.sellerAccount.bankName,
        isVerified: user.sellerAccount.isVerified
      } : null,
      affiliate: {
        referralCode,
        referralLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${referralCode}`,
        totalReferrals: affiliateStats.filter(a => a.isCompleted).length,
        pendingReferrals: affiliateStats.filter(a => !a.isCompleted).length,
        creditsEarned: affiliateStats.reduce((s, a) => s + a.creditsGiven, 0),
        pointsEarned: affiliateStats.reduce((s, a) => s + a.pointsGiven, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/profile — update profile
router.put('/', auth, async (req, res, next) => {
  try {
    const { username, avatarUrl } = req.body;
    const data = {};

    if (username) {
      const existing = await prisma.user.findFirst({
        where: { username, NOT: { id: req.user.id } }
      });
      if (existing) return res.status(409).json({ error: 'Username taken' });
      data.username = username;
    }
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data
    });

    res.json({ message: 'Profile updated', username: user.username });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

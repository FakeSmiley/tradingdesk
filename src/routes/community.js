const express = require('express');
const router = express.Router();
const { auth, requirePremium } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/community/access
router.get('/access', auth, async (req, res, next) => {
  try {
    const user = req.user;
    const communityEnabled = await prisma.adminSetting.findUnique({ where: { key: 'communityEnabled' } });
    const premiumRequired = await prisma.adminSetting.findUnique({ where: { key: 'communityPremiumRequired' } });

    if (communityEnabled?.value === 'false') {
      return res.json({ access: false, reason: 'disabled' });
    }

    const isPremium = user.role === 'ADMIN' ||
      (user.premium?.isActive && user.premium?.expiresAt && new Date(user.premium.expiresAt) > new Date());

    if (premiumRequired?.value === 'true' && !isPremium) {
      return res.json({ access: false, reason: 'premium_required' });
    }

    res.json({ access: true });
  } catch (error) { next(error); }
});

module.exports = router;

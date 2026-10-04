const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/tips/latest
router.get('/latest', auth, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const tip = await prisma.tip.findFirst({
      where: {
        status: 'PUBLISHED',
        OR: [{ expiryDate: null }, { expiryDate: { gte: today } }]
      },
      orderBy: { publishDate: 'desc' }
    });
    res.json({ tip });
  } catch (error) { next(error); }
});

module.exports = router;

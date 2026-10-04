const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/brokers
router.get('/', auth, async (req, res, next) => {
  try {
    const brokers = await prisma.broker.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { name: 'asc' }
    });
    res.json({ brokers });
  } catch (error) { next(error); }
});

module.exports = router;

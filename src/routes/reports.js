const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/reports
router.post('/', auth, async (req, res, next) => {
  try {
    const { category, message } = req.body;
    if (!category || !message) return res.status(400).json({ error: 'Category and message required' });

    const report = await prisma.report.create({
      data: { userId: req.user.id, category, message }
    });
    res.status(201).json({ report, message: 'Report submitted' });
  } catch (error) { next(error); }
});

module.exports = router;

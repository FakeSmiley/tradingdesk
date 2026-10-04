const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `strategy-${req.user.id}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/strategy
router.get('/', auth, async (req, res, next) => {
  try {
    const strategies = await prisma.strategy.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ strategies });
  } catch (error) { next(error); }
});

// GET /api/strategy/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const strategy = await prisma.strategy.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!strategy) return res.status(404).json({ error: 'Strategy not found' });
    res.json({ strategy });
  } catch (error) { next(error); }
});

// POST /api/strategy
router.post('/', auth, upload.single('chart'), async (req, res, next) => {
  try {
    const { name, description, entryRules, confirmationRules, slRules, tpRules, riskRules, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Strategy name is required' });

    const strategy = await prisma.strategy.create({
      data: {
        userId: req.user.id,
        name,
        description,
        entryRules,
        confirmationRules,
        slRules,
        tpRules,
        riskRules,
        notes,
        chartImageUrl: req.file ? `/uploads/${req.file.filename}` : null
      }
    });
    res.status(201).json({ strategy });
  } catch (error) { next(error); }
});

// PUT /api/strategy/:id
router.put('/:id', auth, upload.single('chart'), async (req, res, next) => {
  try {
    const existing = await prisma.strategy.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!existing) return res.status(404).json({ error: 'Strategy not found' });

    const { name, description, entryRules, confirmationRules, slRules, tpRules, riskRules, notes } = req.body;
    const strategy = await prisma.strategy.update({
      where: { id: req.params.id },
      data: {
        name: name || existing.name,
        description,
        entryRules,
        confirmationRules,
        slRules,
        tpRules,
        riskRules,
        notes,
        chartImageUrl: req.file ? `/uploads/${req.file.filename}` : existing.chartImageUrl
      }
    });
    res.json({ strategy });
  } catch (error) { next(error); }
});

// DELETE /api/strategy/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const existing = await prisma.strategy.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!existing) return res.status(404).json({ error: 'Strategy not found' });
    await prisma.strategy.delete({ where: { id: req.params.id } });
    res.json({ message: 'Strategy deleted' });
  } catch (error) { next(error); }
});

module.exports = router;

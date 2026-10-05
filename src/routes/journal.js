const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const prisma = require('../lib/prisma.js');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `journal-${req.user.id}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/journal
router.get('/', auth, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const where = { userId: req.user.id };
    if (month && year) {
      where.date = { startsWith: `${year}-${month.toString().padStart(2, '0')}` };
    }
    const journals = await prisma.journal.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    res.json({ journals });
  } catch (error) { next(error); }
});

// GET /api/journal/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const journal = await prisma.journal.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!journal) return res.status(404).json({ error: 'Journal not found' });
    res.json({ journal });
  } catch (error) { next(error); }
});

// POST /api/journal
router.post('/', auth, upload.single('image'), async (req, res, next) => {
  try {
    const { date, time, title, pair, notes } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const today = new Date().toISOString().slice(0, 10);
    const journal = await prisma.journal.create({
      data: {
        userId: req.user.id,
        date: date || today,
        time,
        title,
        pair,
        notes,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null
      }
    });

    await prisma.activityLog.create({
      data: { userId: req.user.id, type: 'JOURNAL', date: date || today }
    });

    res.status(201).json({ journal });
  } catch (error) { next(error); }
});

// PUT /api/journal/:id
router.put('/:id', auth, upload.single('image'), async (req, res, next) => {
  try {
    const existing = await prisma.journal.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!existing) return res.status(404).json({ error: 'Journal not found' });

    const { date, time, title, pair, notes } = req.body;
    const journal = await prisma.journal.update({
      where: { id: req.params.id },
      data: {
        date: date || existing.date,
        time,
        title: title || existing.title,
        pair,
        notes,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : existing.imageUrl
      }
    });
    res.json({ journal });
  } catch (error) { next(error); }
});

// DELETE /api/journal/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const existing = await prisma.journal.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!existing) return res.status(404).json({ error: 'Journal not found' });
    await prisma.journal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Journal deleted' });
  } catch (error) { next(error); }
});

module.exports = router;

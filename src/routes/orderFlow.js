const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { awardPoints } = require('../services/pointEngine');

const prisma = new PrismaClient();

// GET /api/order-flow/lessons
router.get('/lessons', auth, async (req, res, next) => {
  try {
    const lessons = await prisma.orderFlowLesson.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, description: true, difficulty: true, points: true }
    });
    res.json({ lessons });
  } catch (error) {
    next(error);
  }
});

// GET /api/order-flow/lessons/:id
router.get('/lessons/:id', auth, async (req, res, next) => {
  try {
    const lesson = await prisma.orderFlowLesson.findFirst({
      where: { id: req.params.id, status: 'PUBLISHED' },
      include: { candles: { orderBy: { index: 'asc' } } }
    });
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json({ lesson });
  } catch (error) {
    next(error);
  }
});

// POST /api/order-flow/sessions
router.post('/sessions', auth, async (req, res, next) => {
  try {
    const { lessonId, predictions, correct, accuracy, score } = req.body;
    const userId = req.user.id;

    const lesson = await prisma.orderFlowLesson.findFirst({
      where: { id: lessonId, status: 'PUBLISHED' }
    });
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const accuracyRate = parseFloat(accuracy) || 0;
    const basePoints = lesson.points;
    const pointsEarned = Math.floor(basePoints * (accuracyRate / 100));

    const session = await prisma.orderFlowSession.create({
      data: {
        userId,
        lessonId,
        predictions: parseInt(predictions) || 0,
        correct: parseInt(correct) || 0,
        accuracy: accuracyRate,
        score: parseInt(score) || 0,
        pointsEarned
      }
    });

    if (pointsEarned > 0) {
      await awardPoints(userId, pointsEarned, 'ORDERFLOW', `Order Flow: ${lesson.title}`);
    }

    await prisma.activityLog.create({
      data: { userId, type: 'TRAINING', date: new Date().toISOString().slice(0, 10) }
    });

    res.status(201).json({ session, pointsEarned });
  } catch (error) {
    next(error);
  }
});

// GET /api/order-flow/sessions — user's session history
router.get('/sessions', auth, async (req, res, next) => {
  try {
    const sessions = await prisma.orderFlowSession.findMany({
      where: { userId: req.user.id },
      include: { lesson: { select: { title: true } } },
      orderBy: { completedAt: 'desc' },
      take: 20
    });
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

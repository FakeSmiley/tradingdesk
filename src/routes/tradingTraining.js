const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { awardPoints } = require('../services/pointEngine');

const prisma = new PrismaClient();

// GET /api/training/today
router.get('/today', auth, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const question = await prisma.tradingQuestion.findFirst({
      where: {
        status: 'PUBLISHED',
        OR: [
          { publishDate: { lte: today } },
          { publishDate: null }
        ]
      },
      orderBy: { publishDate: 'desc' }
    });

    if (!question) {
      return res.json({ question: null, message: 'No question available today' });
    }

    // Check if user already answered
    const result = await prisma.trainingResult.findFirst({
      where: { userId: req.user.id, questionId: question.id }
    });

    // Don't reveal correct answer before submission
    const safeQuestion = {
      id: question.id,
      question: question.question,
      chartImageUrl: question.chartImageUrl,
      pair: question.pair,
      timeframe: question.timeframe,
      timerMinutes: question.timerMinutes,
      status: question.status
    };

    res.json({ question: safeQuestion, submitted: !!result, result: result || null });
  } catch (error) {
    next(error);
  }
});

// POST /api/training/submit
router.post('/submit', auth, async (req, res, next) => {
  try {
    const { questionId, direction, trend, reason } = req.body;
    const userId = req.user.id;

    if (!questionId || !direction || !trend) {
      return res.status(400).json({ error: 'questionId, direction, and trend are required' });
    }

    const question = await prisma.tradingQuestion.findFirst({
      where: { id: questionId, status: 'PUBLISHED' }
    });

    if (!question) return res.status(404).json({ error: 'Question not found' });

    // Check duplicate submission
    const existing = await prisma.trainingResult.findFirst({
      where: { userId, questionId }
    });
    if (existing) {
      return res.status(409).json({ error: 'Already submitted for this question' });
    }

    const isDirectionCorrect = direction === question.correctDirection;
    const isTrendCorrect = trend === question.correctTrend;
    const isCorrect = isDirectionCorrect && isTrendCorrect;
    const pointsEarned = isCorrect ? question.points : Math.floor(question.points * 0.25);

    const today = new Date().toISOString().slice(0, 10);

    const result = await prisma.trainingResult.create({
      data: {
        userId,
        questionId,
        direction,
        trend,
        reason: reason || '',
        isCorrect,
        isDirectionCorrect,
        isTrendCorrect,
        pointsEarned,
        date: today
      }
    });

    await awardPoints(userId, pointsEarned, 'TRAINING', 'Daily trading question');

    await prisma.activityLog.create({
      data: { userId, type: 'TRAINING', date: today }
    });

    res.json({
      result,
      correct: isCorrect,
      correctDirection: question.correctDirection,
      correctTrend: question.correctTrend,
      explanation: question.explanation,
      pointsEarned
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/training/history
router.get('/history', auth, async (req, res, next) => {
  try {
    const results = await prisma.trainingResult.findMany({
      where: { userId: req.user.id },
      include: { question: true },
      orderBy: { submittedAt: 'desc' },
      take: 50
    });
    res.json({ results });
  } catch (error) {
    next(error);
  }
});

// GET /api/training/leaderboard-today (Premium)
router.get('/leaderboard-today', auth, async (req, res, next) => {
  try {
    const user = req.user;
    const isPremium = user.role === 'ADMIN' ||
      (user.premium?.isActive && user.premium?.expiresAt && new Date(user.premium.expiresAt) > new Date());

    if (!isPremium) {
      return res.status(403).json({ error: 'Premium access required' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const question = await prisma.tradingQuestion.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { publishDate: 'desc' }
    });

    if (!question) return res.json({ results: [], question: null });

    const results = await prisma.trainingResult.findMany({
      where: { questionId: question.id, date: today },
      include: { user: { select: { username: true } } },
      orderBy: { pointsEarned: 'desc' }
    });

    res.json({
      question: {
        id: question.id,
        question: question.question,
        pair: question.pair,
        timeframe: question.timeframe,
        correctDirection: question.correctDirection,
        correctTrend: question.correctTrend
      },
      results: results.map(r => ({
        username: r.user.username,
        direction: r.direction,
        trend: r.trend,
        isCorrect: r.isCorrect,
        pointsEarned: r.pointsEarned
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

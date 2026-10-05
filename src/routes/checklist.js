const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { awardPoints } = require('../services/pointEngine');

const prisma = require('../lib/prisma.js');

// GET /api/checklist — today's tasks with completion status
router.get('/', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const tasks = await prisma.checklistTask.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { displayOrder: 'asc' }
    });

    const history = await prisma.checklistHistory.findMany({
      where: { userId, date: today }
    });

    const completedIds = new Set(history.map(h => h.taskId));

    const result = tasks.map(t => ({
      ...t,
      completed: completedIds.has(t.id)
    }));

    const totalPoints = history.reduce((s, h) => s + h.pointsEarned, 0);

    res.json({
      tasks: result,
      completedCount: completedIds.size,
      totalCount: tasks.length,
      totalPointsToday: totalPoints,
      date: today
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/checklist/:taskId/complete
router.post('/:taskId/complete', auth, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const task = await prisma.checklistTask.findFirst({
      where: { id: taskId, status: 'ACTIVE' }
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Check if already completed today
    const existing = await prisma.checklistHistory.findFirst({
      where: { userId, taskId, date: today }
    });
    if (existing) {
      return res.status(409).json({ error: 'Task already completed today' });
    }

    const pointsEarned = task.points;

    await prisma.checklistHistory.create({
      data: { userId, taskId, date: today, pointsEarned }
    });

    await awardPoints(userId, pointsEarned, 'CHECKLIST', `Checklist: ${task.name}`);

    await prisma.activityLog.create({
      data: { userId, type: 'CHECKLIST', date: today, meta: JSON.stringify({ taskId, taskName: task.name }) }
    });

    res.json({ message: 'Task completed', pointsEarned });
  } catch (error) {
    next(error);
  }
});

// GET /api/checklist/history
router.get('/history', auth, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const userId = req.user.id;

    const where = { userId };
    if (month && year) {
      where.date = { startsWith: `${year}-${month.toString().padStart(2, '0')}` };
    }

    const history = await prisma.checklistHistory.findMany({
      where,
      include: { task: true },
      orderBy: { completedAt: 'desc' }
    });

    res.json({ history });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

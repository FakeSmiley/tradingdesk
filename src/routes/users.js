const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const prisma = require('../lib/prisma.js');

// GET /api/users/me — get current user profile (basic)
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        loginDays: true,
        currentStreak: true,
        bestStreak: true,
        premium: true,
        trial: true
      }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Placeholder routes for future user management (admin only)
router.get('/', auth, (req, res) => {
  res.json({ message: 'User list endpoint placeholder' });
});

router.put('/:id', auth, (req, res) => {
  res.json({ message: 'User update placeholder' });
});

module.exports = router;

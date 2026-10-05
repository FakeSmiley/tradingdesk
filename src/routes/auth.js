const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authLimiter } = require('../middleware/rateLimiter');
const { addNormalCredits } = require('../services/creditEngine');
const { awardPoints } = require('../services/pointEngine');
const { logAudit } = require('../services/auditLog');

const prisma = require('../lib/prisma.js');

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { username, email, password, referralCode } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check duplicates
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username }] }
    });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        passwordHash,
        role: 'USER',
        status: 'ACTIVE'
      }
    });

    // Initialize related records
    await prisma.userCredits.create({ data: { userId: user.id } });
    await prisma.userPoints.create({ data: { userId: user.id } });
    await prisma.analytics.create({ data: { userId: user.id } });

    // Handle trial
    const trialEnabled = await prisma.adminSetting.findUnique({ where: { key: 'trialEnabled' } });
    const trialDuration = await prisma.adminSetting.findUnique({ where: { key: 'trialDuration' } });
    const trialCredits = await prisma.adminSetting.findUnique({ where: { key: 'trialCredits' } });

    if (trialEnabled?.value === 'true') {
      const days = parseInt(trialDuration?.value || '14');
      const credits = parseInt(trialCredits?.value || '50');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      await prisma.trialUsage.create({
        data: {
          userId: user.id,
          isActive: true,
          startedAt: new Date(),
          expiresAt,
          creditsGiven: credits
        }
      });

      // Give trial credits
      await addNormalCredits(user.id, credits, 'BONUS', 'Trial welcome credits');
    }

    // Handle referral
    if (referralCode) {
      await handleReferral(user.id, referralCode);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: { userId: user.id, token: accessToken, refreshToken, expiresAt }
    });

    await logAudit({
      action: 'USER_REGISTERED',
      targetUserId: user.id,
      newValue: { username, email: email.toLowerCase() }
    });

    res.status(201).json({
      message: 'Registration successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username: email }] },
      include: { premium: true, trial: true, credits: true, points: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({ error: 'Account is banned' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update login streak
    const today = new Date().toISOString().slice(0, 10);
    const lastLogin = user.lastLoginAt ? user.lastLoginAt.toISOString().slice(0, 10) : null;
    let newStreak = user.currentStreak;
    let newLoginDays = user.loginDays;

    if (lastLogin !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (lastLogin === yesterday) {
        newStreak = user.currentStreak + 1;
      } else if (!lastLogin) {
        newStreak = 1;
      } else {
        newStreak = 1;
      }
      newLoginDays = user.loginDays + 1;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginDays: newLoginDays,
          currentStreak: newStreak,
          bestStreak: Math.max(user.bestStreak, newStreak)
        }
      });

      // Log activity
      await prisma.activityLog.create({
        data: { userId: user.id, type: 'LOGIN', date: today }
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Clean old sessions
    await prisma.session.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } }
    });

    await prisma.session.create({
      data: { userId: user.id, token: accessToken, refreshToken, expiresAt }
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        currentStreak: newStreak,
        loginDays: newLoginDays,
        premium: user.premium,
        trial: user.trial,
        credits: user.credits,
        points: user.points
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const session = await prisma.session.findFirst({
      where: { refreshToken, userId: decoded.userId }
    });

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.update({
      where: { id: session.id },
      data: { token: accessToken, refreshToken: newRefresh, expiresAt }
    });

    res.json({ accessToken, refreshToken: newRefresh });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await prisma.session.deleteMany({ where: { token } });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').auth, async (req, res) => {
  const user = req.user;
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    loginDays: user.loginDays,
    currentStreak: user.currentStreak,
    bestStreak: user.bestStreak,
    lastLoginAt: user.lastLoginAt,
    avatarUrl: user.avatarUrl,
    premium: user.premium,
    trial: user.trial,
    credits: user.credits,
    points: user.points
  });
});

async function handleReferral(newUserId, referralCode) {
  try {
    const affiliateEnabled = await prisma.adminSetting.findUnique({ where: { key: 'affiliateEnabled' } });
    if (affiliateEnabled?.value !== 'true') return;

    // Find referrer by code (stored in settings or as username)
    const referrer = await prisma.user.findFirst({ where: { username: referralCode } });
    if (!referrer || referrer.id === newUserId) return;

    // Check no existing referral
    const existing = await prisma.affiliateReferral.findUnique({ where: { referredId: newUserId } });
    if (existing) return;

    const creditReward = parseInt((await prisma.adminSetting.findUnique({ where: { key: 'affiliateCreditReward' } }))?.value || '2');
    const pointReward = parseInt((await prisma.adminSetting.findUnique({ where: { key: 'affiliatePointReward' } }))?.value || '2');

    await prisma.affiliateReferral.create({
      data: {
        referrerId: referrer.id,
        referredId: newUserId,
        referralCode,
        isCompleted: true,
        creditsGiven: creditReward,
        pointsGiven: pointReward,
        completedAt: new Date()
      }
    });

    await addNormalCredits(referrer.id, creditReward, 'AFFILIATE', `Referral reward for ${newUserId}`);
    await awardPoints(referrer.id, pointReward, 'AFFILIATE', 'Referral reward');
  } catch (err) {
    console.error('Referral error:', err.message);
  }
}

module.exports = router;

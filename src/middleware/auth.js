const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        premium: true,
        trial: true,
        credits: true,
        points: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({ error: 'Account is banned' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(error);
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requirePremium = async (req, res, next) => {
  const user = req.user;
  const now = new Date();

  if (user.role === 'ADMIN') return next();

  const premium = user.premium;
  if (premium && premium.isActive && premium.expiresAt && new Date(premium.expiresAt) > now) {
    return next();
  }

  return res.status(403).json({ error: 'Premium access required' });
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { premium: true, credits: true, points: true }
    });

    req.user = user;
    next();
  } catch {
    req.user = null;
    next();
  }
};

module.exports = { auth, requireAdmin, requirePremium, optionalAuth };

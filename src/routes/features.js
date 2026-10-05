const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const prisma = require('../lib/prisma.js');

// GET /api/features — get all feature access states
router.get('/', auth, async (req, res, next) => {
  try {
    const features = await prisma.featureAccess.findMany();
    const result = {};
    features.forEach(f => { result[f.feature] = f.isEnabled; });
    res.json({ features: result });
  } catch (error) { next(error); }
});

module.exports = router;

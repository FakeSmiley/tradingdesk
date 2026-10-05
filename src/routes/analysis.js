const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const prisma = require('../lib/prisma.js');

// Analysis route - returns structured analysis based on pair/timeframe
// NOTE: All analysis is educational/theoretical, not financial advice
router.post('/general', auth, async (req, res, next) => {
  try {
    const { pair, timeframe, analysisType } = req.body;
    if (!pair || !timeframe) {
      return res.status(400).json({ error: 'pair and timeframe are required' });
    }

    // Return analysis structure (users input their own data for educational analysis)
    res.json({
      pair,
      timeframe,
      analysisType: analysisType || 'GENERAL',
      disclaimer: 'Analysis tools are provided for educational and training purposes only. This is not financial advice.',
      structure: {
        trend: null,
        structure: null,
        bias: null,
        entryZone: null,
        stopLoss: null,
        takeProfit: null,
        riskReward: null,
        confidence: null
      },
      message: 'Use the chart tools to mark your analysis. The system will help you structure it educationally.'
    });
  } catch (error) {
    next(error);
  }
});

// Save analysis annotation
router.post('/save', auth, async (req, res, next) => {
  try {
    const { pair, timeframe, analysisType, data } = req.body;
    // Store analysis in activity log for educational tracking
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        type: 'TRAINING',
        date: new Date().toISOString().slice(0, 10),
        meta: JSON.stringify({ pair, timeframe, analysisType })
      }
    });
    res.json({ message: 'Analysis saved' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

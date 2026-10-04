const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { priceLimiter } = require('../middleware/rateLimiter');
const { getPrices } = require('../services/twelveData');

const ALLOWED_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
  'USD/CAD', 'NZD/USD', 'EUR/JPY', 'GBP/JPY', 'EUR/GBP'
];

// GET /api/prices — get current prices for all pairs
router.get('/', auth, priceLimiter, async (req, res, next) => {
  try {
    const prices = await getPrices(ALLOWED_PAIRS);
    res.json({
      prices,
      lastUpdated: new Date().toISOString(),
      pairs: ALLOWED_PAIRS
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/prices/:symbol — get single pair price
router.get('/:symbol', auth, priceLimiter, async (req, res, next) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol).toUpperCase();
    if (!ALLOWED_PAIRS.includes(symbol)) {
      return res.status(400).json({ error: 'Invalid pair' });
    }
    const prices = await getPrices([symbol]);
    res.json({ symbol, ...prices[symbol] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

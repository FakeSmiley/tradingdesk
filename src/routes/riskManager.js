const express = require('express');
const router = express.Router();

// Stub routes for remaining endpoints
const { auth } = require('../middleware/auth');
const prisma = require('../lib/prisma.js');

// Risk Manager - pure calculation (no DB needed)
router.post('/calculate', auth, (req, res) => {
  const { accountBalance, lotSize, direction, entryPrice, riskPercent, profitPercent, pair } = req.body;

  if (!accountBalance || !lotSize || !entryPrice) {
    return res.status(400).json({ error: 'accountBalance, lotSize, and entryPrice are required' });
  }

  const balance = parseFloat(accountBalance);
  const lot = parseFloat(lotSize);
  const entry = parseFloat(entryPrice);
  const riskPct = parseFloat(riskPercent || 1);
  const profitPct = parseFloat(profitPercent || 2);
  const isJPY = (pair || '').includes('JPY');

  const pipValue = isJPY ? 0.01 : 0.0001;
  const riskAmount = balance * (riskPct / 100);
  const profitAmount = balance * (profitPct / 100);

  // Pip value per lot (simplified: 1 lot = 100,000 units, pip = $10 for non-JPY)
  const pipDollar = isJPY ? (lot * 1000 / entry) : (lot * 10);

  const slPips = riskAmount / pipDollar;
  const tpPips = profitAmount / pipDollar;

  let slPrice, tpPrice;
  if (direction === 'BUY') {
    slPrice = parseFloat((entry - slPips * pipValue).toFixed(isJPY ? 3 : 5));
    tpPrice = parseFloat((entry + tpPips * pipValue).toFixed(isJPY ? 3 : 5));
  } else {
    slPrice = parseFloat((entry + slPips * pipValue).toFixed(isJPY ? 3 : 5));
    tpPrice = parseFloat((entry - tpPips * pipValue).toFixed(isJPY ? 3 : 5));
  }

  const rr = (profitAmount / riskAmount).toFixed(2);

  let riskStatus = 'SAFE';
  if (riskPct > 3) riskStatus = 'HIGH_RISK';
  else if (riskPct > 1.5) riskStatus = 'MODERATE';

  res.json({
    slPrice,
    tpPrice,
    slDistance: parseFloat(slPips.toFixed(1)),
    tpDistance: parseFloat(tpPips.toFixed(1)),
    riskAmount: parseFloat(riskAmount.toFixed(2)),
    potentialProfit: parseFloat(profitAmount.toFixed(2)),
    riskReward: parseFloat(rr),
    riskStatus
  });
});

module.exports = router;

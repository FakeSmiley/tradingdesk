const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { getPrices } = require('../services/twelveData');
const { awardPoints, deductPoints } = require('../services/pointEngine');

const prisma = new PrismaClient();

const ALLOWED_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
  'USD/CAD', 'NZD/USD', 'EUR/JPY', 'GBP/JPY', 'EUR/GBP'
];

async function getPaperSettings() {
  const settings = await prisma.adminSetting.findMany({
    where: {
      key: {
        in: ['paperTradingEnabled', 'maxTradesPerDay', 'dailyLossLimit', 'dailyProfitTarget',
             'profitPointRate', 'lossPointRate', 'maxPointsPerTrade', 'maxLossPoints', 'dailyPointLimit']
      }
    }
  });
  const r = {};
  settings.forEach(s => { r[s.key] = s.value; });
  return r;
}

async function checkDailyLimits(userId, settings) {
  const today = new Date().toISOString().slice(0, 10);
  const todayTrades = await prisma.paperTrade.count({
    where: { userId, date: today }
  });

  const maxTrades = parseInt(settings.maxTradesPerDay || '10');
  if (todayTrades >= maxTrades) {
    return { allowed: false, reason: `Daily trade limit reached (${maxTrades} trades)` };
  }

  // Check daily loss/profit
  const closedTrades = await prisma.paperTrade.findMany({
    where: { userId, date: today, status: 'CLOSED' }
  });

  const todayPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const dailyLossLimit = parseFloat(settings.dailyLossLimit || '1000');
  const dailyProfitTarget = parseFloat(settings.dailyProfitTarget || '2000');

  if (todayPnl <= -dailyLossLimit) {
    return { allowed: false, reason: 'Daily loss limit reached' };
  }
  if (todayPnl >= dailyProfitTarget) {
    return { allowed: false, reason: 'Daily profit target reached' };
  }

  return { allowed: true };
}

// GET /api/paper-trading/summary
router.get('/summary', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const [positions, orders, closedToday] = await Promise.all([
      prisma.position.findMany({ where: { userId, status: 'OPEN' } }),
      prisma.order.findMany({ where: { userId, status: 'PENDING' } }),
      prisma.paperTrade.findMany({ where: { userId, date: today, status: 'CLOSED' } })
    ]);

    const todayPnl = closedToday.reduce((s, t) => s + t.pnl, 0);
    const wins = closedToday.filter(t => t.pnl > 0).length;
    const losses = closedToday.filter(t => t.pnl < 0).length;
    const winRate = closedToday.length > 0 ? (wins / closedToday.length * 100).toFixed(1) : '0.0';

    const balance = 10000; // Default paper trading balance
    const equity = balance + todayPnl;
    const usedMargin = positions.reduce((s, p) => s + p.lotSize * 1000, 0);

    res.json({
      balance,
      equity: parseFloat(equity.toFixed(2)),
      pnl: parseFloat(todayPnl.toFixed(2)),
      margin: parseFloat(usedMargin.toFixed(2)),
      freeMargin: parseFloat((equity - usedMargin).toFixed(2)),
      todayStats: { total: closedToday.length, wins, losses, winRate: parseFloat(winRate) },
      openPositions: positions.length,
      pendingOrders: orders.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/paper-trading/positions
router.get('/positions', auth, async (req, res, next) => {
  try {
    const positions = await prisma.position.findMany({
      where: { userId: req.user.id, status: 'OPEN' },
      orderBy: { openedAt: 'desc' }
    });
    res.json({ positions });
  } catch (error) {
    next(error);
  }
});

// GET /api/paper-trading/orders
router.get('/orders', auth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

// GET /api/paper-trading/history
router.get('/history', auth, async (req, res, next) => {
  try {
    const history = await prisma.orderHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { closedAt: 'desc' },
      take: 100
    });
    res.json({ history });
  } catch (error) {
    next(error);
  }
});

// POST /api/paper-trading/trade — open a market trade
router.post('/trade', auth, async (req, res, next) => {
  try {
    const { pair, type, lotSize, stopLoss, takeProfit } = req.body;
    const userId = req.user.id;

    if (!ALLOWED_PAIRS.includes(pair)) {
      return res.status(400).json({ error: 'Invalid currency pair' });
    }
    if (!['BUY', 'SELL'].includes(type)) {
      return res.status(400).json({ error: 'Type must be BUY or SELL' });
    }
    if (!lotSize || lotSize <= 0 || lotSize > 100) {
      return res.status(400).json({ error: 'Invalid lot size' });
    }

    const settings = await getPaperSettings();
    if (settings.paperTradingEnabled === 'false') {
      return res.status(403).json({ error: 'Paper trading is currently disabled' });
    }

    const limitCheck = await checkDailyLimits(userId, settings);
    if (!limitCheck.allowed) {
      return res.status(403).json({ error: limitCheck.reason });
    }

    // Get live price
    const prices = await getPrices([pair]);
    const priceData = prices[pair];
    if (!priceData) {
      return res.status(503).json({ error: 'Price data unavailable' });
    }

    const entryPrice = type === 'BUY' ? priceData.ask : priceData.bid;
    const today = new Date().toISOString().slice(0, 10);

    const [position, trade] = await Promise.all([
      prisma.position.create({
        data: {
          userId,
          pair,
          type,
          lotSize: parseFloat(lotSize),
          entryPrice,
          stopLoss: stopLoss ? parseFloat(stopLoss) : null,
          takeProfit: takeProfit ? parseFloat(takeProfit) : null,
          currentPrice: entryPrice,
          pnl: 0,
          status: 'OPEN'
        }
      }),
      prisma.paperTrade.create({
        data: {
          userId,
          pair,
          type,
          lotSize: parseFloat(lotSize),
          entryPrice,
          stopLoss: stopLoss ? parseFloat(stopLoss) : null,
          takeProfit: takeProfit ? parseFloat(takeProfit) : null,
          spread: priceData.spread || 0,
          status: 'OPEN',
          date: today
        }
      })
    ]);

    await prisma.activityLog.create({
      data: { userId, type: 'PAPER_TRADE', date: today, meta: JSON.stringify({ pair, type, lotSize }) }
    });

    res.status(201).json({ position, trade, entryPrice });
  } catch (error) {
    next(error);
  }
});

// POST /api/paper-trading/close/:positionId
router.post('/close/:positionId', auth, async (req, res, next) => {
  try {
    const { positionId } = req.params;
    const userId = req.user.id;

    const position = await prisma.position.findFirst({
      where: { id: positionId, userId, status: 'OPEN' }
    });

    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    // Get current price
    const prices = await getPrices([position.pair]);
    const priceData = prices[position.pair];
    const exitPrice = position.type === 'BUY' ? priceData?.bid : priceData?.ask;
    const finalPrice = exitPrice || position.entryPrice;

    // Calculate P&L (simplified: pips * lot * 10)
    const pipValue = position.pair.includes('JPY') ? 100 : 10000;
    const pips = position.type === 'BUY'
      ? (finalPrice - position.entryPrice) * pipValue
      : (position.entryPrice - finalPrice) * pipValue;
    const pnl = parseFloat((pips * position.lotSize * 1).toFixed(2));

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    await prisma.position.update({
      where: { id: positionId },
      data: { status: 'CLOSED', closedAt: now, currentPrice: finalPrice, pnl }
    });

    // Create order history
    await prisma.orderHistory.create({
      data: {
        userId,
        pair: position.pair,
        type: position.type,
        lotSize: position.lotSize,
        entryPrice: position.entryPrice,
        exitPrice: finalPrice,
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit,
        spread: priceData?.spread || 0,
        pnl,
        status: 'CLOSED',
        openedAt: position.openedAt,
        closedAt: now
      }
    });

    // Update paper trade record
    await prisma.paperTrade.updateMany({
      where: { userId, pair: position.pair, status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: now, exitPrice: finalPrice, pnl }
    });

    // Award/deduct points based on P&L
    const settings = await getPaperSettings();
    const profitRate = parseFloat(settings.profitPointRate || '1');
    const lossRate = parseFloat(settings.lossPointRate || '1');
    const maxPoints = parseInt(settings.maxPointsPerTrade || '50');
    const maxLoss = parseInt(settings.maxLossPoints || '50');

    if (pnl > 0) {
      const earned = Math.min(Math.floor(pnl * profitRate), maxPoints);
      if (earned > 0) await awardPoints(userId, earned, 'PAPER_TRADING', `Trade profit: ${position.pair}`);
    } else if (pnl < 0) {
      const lost = Math.min(Math.floor(Math.abs(pnl) * lossRate), maxLoss);
      if (lost > 0) await deductPoints(userId, lost, 'PAPER_TRADING', `Trade loss: ${position.pair}`);
    }

    await prisma.activityLog.create({
      data: { userId, type: 'PAPER_TRADE', date: today, meta: JSON.stringify({ action: 'CLOSE', pair: position.pair, pnl }) }
    });

    res.json({ message: 'Position closed', pnl, exitPrice: finalPrice });
  } catch (error) {
    next(error);
  }
});

// POST /api/paper-trading/close-all
router.post('/close-all', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const positions = await prisma.position.findMany({
      where: { userId, status: 'OPEN' }
    });

    const prices = await getPrices(ALLOWED_PAIRS);
    const closed = [];

    for (const pos of positions) {
      const priceData = prices[pos.pair];
      const exitPrice = pos.type === 'BUY' ? priceData?.bid : priceData?.ask;
      const finalPrice = exitPrice || pos.entryPrice;

      const pipValue = pos.pair.includes('JPY') ? 100 : 10000;
      const pips = pos.type === 'BUY'
        ? (finalPrice - pos.entryPrice) * pipValue
        : (pos.entryPrice - finalPrice) * pipValue;
      const pnl = parseFloat((pips * pos.lotSize).toFixed(2));

      await prisma.position.update({
        where: { id: pos.id },
        data: { status: 'CLOSED', closedAt: new Date(), currentPrice: finalPrice, pnl }
      });

      await prisma.orderHistory.create({
        data: {
          userId,
          pair: pos.pair,
          type: pos.type,
          lotSize: pos.lotSize,
          entryPrice: pos.entryPrice,
          exitPrice: finalPrice,
          spread: priceData?.spread || 0,
          pnl,
          status: 'CLOSED',
          openedAt: pos.openedAt,
          closedAt: new Date()
        }
      });

      closed.push({ pair: pos.pair, pnl });
    }

    res.json({ message: `Closed ${closed.length} positions`, positions: closed });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/paper-trading/orders/:orderId
router.delete('/orders/:orderId', auth, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, userId: req.user.id }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' }
    });

    res.json({ message: 'Order cancelled' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { newsLimiter } = require('../middleware/rateLimiter');
const { getNews, getNewsStatus } = require('../services/gnews');
const prisma = require('../lib/prisma.js');

// GET /api/news
router.get('/', auth, newsLimiter, async (req, res, next) => {
  try {
    // Check if GNews is enabled
    const gnewsEnabled = await prisma.adminSetting.findUnique({ where: { key: 'gnewsEnabled' } });
    if (gnewsEnabled?.value === 'false') {
      return res.json({ articles: [], status: 'disabled', message: 'News service is currently unavailable.' });
    }

    const { currency, category, limit = 20, offset = 0, search = '' } = req.query;

    const articles = await getNews({ currency, category, limit, offset, search });
    const status = await getNewsStatus();

    res.json({
      articles,
      total: articles.length,
      lastUpdated: status.lastFetched,
      status: status.configured ? 'ok' : 'no_key'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/news/status
router.get('/status', auth, async (req, res, next) => {
  try {
    const status = await getNewsStatus();
    // Never include API key info
    res.json({
      configured: status.configured,
      articleCount: status.articleCount,
      lastFetched: status.lastFetched,
      cacheAge: status.cacheAge
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

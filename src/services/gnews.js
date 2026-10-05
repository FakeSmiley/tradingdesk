const axios = require('axios');
const prisma = require('../lib/prisma.js');

// ─── GNEWS SERVICE ─────────────────────────────────────────────
// API key NEVER leaves the server
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let lastFetchTime = 0;
let isFetching = false;

const FOREX_KEYWORDS = [
  'forex', 'currency', 'exchange rate', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD',
  'Federal Reserve', 'ECB', 'Bank of England', 'interest rate', 'inflation', 'CPI', 'NFP',
  'non-farm payroll', 'GDP', 'PMI', 'trade balance', 'central bank', 'monetary policy',
  'oil price', 'gold price', 'commodities', 'market', 'economy', 'economic'
];

async function fetchAndCacheNews() {
  if (!GNEWS_API_KEY || GNEWS_API_KEY === 'your_gnews_api_key_here') {
    return { success: false, reason: 'no_key' };
  }

  const now = Date.now();
  if (now - lastFetchTime < CACHE_TTL_MS || isFetching) {
    return { success: true, reason: 'cached' };
  }

  isFetching = true;
  try {
    const query = 'forex OR currency OR "interest rate" OR "central bank" OR USD OR EUR OR GBP OR gold OR oil';
    const response = await axios.get('https://gnews.io/api/v4/search', {
      params: {
        q: query,
        lang: 'en',
        country: 'any',
        max: 50,
        apikey: GNEWS_API_KEY
      },
      timeout: 10000
    });

    const articles = response.data.articles || [];

    // Dedup and store
    for (const article of articles) {
      const articleId = Buffer.from(article.url).toString('base64').slice(0, 64);
      const category = categorizeArticle(article);
      const currency = extractCurrency(article);

      await prisma.newsCache.upsert({
        where: { articleId },
        create: {
          articleId,
          title: article.title || '',
          description: article.description || '',
          url: article.url || '',
          source: article.source?.name || '',
          publishedAt: article.publishedAt || new Date().toISOString(),
          category,
          currency,
          imageUrl: article.image || null,
          cachedAt: new Date()
        },
        update: {
          cachedAt: new Date()
        }
      });
    }

    lastFetchTime = now;

    // Clean old articles (older than 48 hours)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await prisma.newsCache.deleteMany({
      where: { publishedAt: { lt: cutoff } }
    });

    return { success: true, reason: 'fetched', count: articles.length };
  } catch (error) {
    console.error('GNews fetch error:', error.message);
    return { success: false, reason: 'api_error', error: error.message };
  } finally {
    isFetching = false;
  }
}

function categorizeArticle(article) {
  const text = `${article.title} ${article.description}`.toLowerCase();

  if (/federal reserve|fed|fomc|powell/i.test(text)) return 'Central Bank';
  if (/interest rate|rate hike|rate cut/i.test(text)) return 'Interest Rate';
  if (/\bcpi\b|consumer price index/i.test(text)) return 'CPI';
  if (/\bppi\b|producer price/i.test(text)) return 'PPI';
  if (/\bgdp\b|gross domestic/i.test(text)) return 'GDP';
  if (/\bpmi\b|purchasing managers/i.test(text)) return 'PMI';
  if (/employment|jobs|labor|labour/i.test(text)) return 'Employment';
  if (/non-farm payroll|nfp/i.test(text)) return 'NFP';
  if (/inflation|deflation/i.test(text)) return 'Inflation';
  if (/\boil\b|crude|petroleum/i.test(text)) return 'Oil';
  if (/\bgold\b|xau/i.test(text)) return 'Gold';

  return 'General Market News';
}

function extractCurrency(article) {
  const text = `${article.title} ${article.description}`;
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];
  const found = currencies.filter(c => new RegExp(`\\b${c}\\b`, 'i').test(text));
  return found.join(',') || null;
}

async function getNews({ currency, category, limit = 20, offset = 0, search = '' }) {
  // Try to refresh cache
  await fetchAndCacheNews();

  const where = {};

  if (currency && currency !== 'ALL') {
    where.currency = { contains: currency };
  }

  if (category && category !== 'ALL') {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } }
    ];
  }

  const articles = await prisma.newsCache.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: parseInt(limit),
    skip: parseInt(offset)
  });

  // Never expose API key in response
  return articles.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    url: a.url,
    source: a.source,
    publishedAt: a.publishedAt,
    category: a.category,
    currency: a.currency,
    imageUrl: a.imageUrl
  }));
}

async function getNewsStatus() {
  const hasKey = GNEWS_API_KEY && GNEWS_API_KEY !== 'your_gnews_api_key_here';
  const count = await prisma.newsCache.count();
  return {
    configured: hasKey,
    articleCount: count,
    lastFetched: lastFetchTime ? new Date(lastFetchTime).toISOString() : null,
    cacheAge: lastFetchTime ? Math.floor((Date.now() - lastFetchTime) / 1000) : null
  };
}

module.exports = { getNews, fetchAndCacheNews, getNewsStatus };

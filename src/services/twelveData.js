const axios = require('axios');

// ─── TWELVE DATA SERVICE ────────────────────────────────────────
// API key NEVER leaves the server
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

// In-memory cache: { symbol: { price, bid, ask, spread, change, changePercent, timestamp } }
const priceCache = new Map();
const CACHE_TTL = 5000; // 5 seconds

// Mock prices as fallback (when no API key or API fails)
const MOCK_PRICES = {
  'EUR/USD': { price: 1.0842, bid: 1.0840, ask: 1.0844, change: 0.0012, changePercent: 0.11, spread: 0.4 },
  'GBP/USD': { price: 1.2734, bid: 1.2732, ask: 1.2736, change: -0.0023, changePercent: -0.18, spread: 0.4 },
  'USD/JPY': { price: 149.82, bid: 149.80, ask: 149.84, change: 0.31, changePercent: 0.21, spread: 0.4 },
  'USD/CHF': { price: 0.9012, bid: 0.9010, ask: 0.9014, change: -0.0008, changePercent: -0.09, spread: 0.4 },
  'AUD/USD': { price: 0.6523, bid: 0.6521, ask: 0.6525, change: 0.0007, changePercent: 0.11, spread: 0.4 },
  'USD/CAD': { price: 1.3641, bid: 1.3639, ask: 1.3643, change: 0.0014, changePercent: 0.10, spread: 0.4 },
  'NZD/USD': { price: 0.5987, bid: 0.5985, ask: 0.5989, change: -0.0011, changePercent: -0.18, spread: 0.4 },
  'EUR/JPY': { price: 162.43, bid: 162.41, ask: 162.45, change: 0.52, changePercent: 0.32, spread: 0.4 },
  'GBP/JPY': { price: 190.87, bid: 190.85, ask: 190.89, change: -0.38, changePercent: -0.20, spread: 0.4 },
  'EUR/GBP': { price: 0.8508, bid: 0.8506, ask: 0.8510, change: 0.0003, changePercent: 0.04, spread: 0.4 }
};

function addMockNoise(price, symbol) {
  const factor = price > 100 ? 0.05 : 0.0002;
  const noise = (Math.random() - 0.5) * factor;
  return parseFloat((price + noise).toFixed(symbol.includes('JPY') ? 3 : 5));
}

async function getPrices(symbols = Object.keys(MOCK_PRICES)) {
  const hasKey = TWELVE_DATA_API_KEY && TWELVE_DATA_API_KEY !== 'your_twelve_data_api_key_here';
  const now = Date.now();
  const result = {};

  if (hasKey) {
    // Check what needs refreshing
    const toFetch = symbols.filter(s => {
      const cached = priceCache.get(s);
      return !cached || (now - cached.timestamp) > CACHE_TTL;
    });

    if (toFetch.length > 0) {
      try {
        const symbolStr = toFetch.map(s => s.replace('/', '')).join(',');
        const response = await axios.get('https://api.twelvedata.com/price', {
          params: { symbol: symbolStr, apikey: TWELVE_DATA_API_KEY },
          timeout: 8000
        });

        // Twelve Data returns different format for single vs multiple
        const data = response.data;
        for (const sym of toFetch) {
          const key = sym.replace('/', '');
          const priceData = data[key] || data;
          if (priceData && priceData.price) {
            const price = parseFloat(priceData.price);
            const spread = sym.includes('JPY') ? 0.03 : 0.0002;
            const isJPY = sym.includes('JPY');
            const bid = parseFloat((price - spread / 2).toFixed(isJPY ? 3 : 5));
            const ask = parseFloat((price + spread / 2).toFixed(isJPY ? 3 : 5));
            const prevClose = MOCK_PRICES[sym]?.price || price;
            const change = parseFloat((price - prevClose).toFixed(isJPY ? 3 : 5));
            const changePercent = parseFloat(((change / prevClose) * 100).toFixed(2));

            priceCache.set(sym, { price, bid, ask, spread: spread * 10000, change, changePercent, timestamp: now });
          }
        }
      } catch (err) {
        console.error('Twelve Data API error:', err.message);
      }
    }

    // Return from cache + fallback to mock
    for (const sym of symbols) {
      const cached = priceCache.get(sym);
      if (cached) {
        result[sym] = { ...cached };
        delete result[sym].timestamp;
      } else {
        // Use mock with noise
        const mock = MOCK_PRICES[sym];
        if (mock) {
          result[sym] = {
            price: addMockNoise(mock.price, sym),
            bid: addMockNoise(mock.bid, sym),
            ask: addMockNoise(mock.ask, sym),
            spread: mock.spread,
            change: mock.change,
            changePercent: mock.changePercent,
            isMock: true
          };
        }
      }
    }
  } else {
    // No API key — use mock prices with noise for realistic simulation
    for (const sym of symbols) {
      const mock = MOCK_PRICES[sym];
      if (mock) {
        const noisy = addMockNoise(mock.price, sym);
        result[sym] = {
          price: noisy,
          bid: addMockNoise(mock.bid, sym),
          ask: addMockNoise(mock.ask, sym),
          spread: mock.spread,
          change: mock.change,
          changePercent: mock.changePercent,
          isMock: true
        };
      }
    }
  }

  return result;
}

async function getPrice(symbol) {
  const prices = await getPrices([symbol]);
  return prices[symbol] || null;
}

module.exports = { getPrices, getPrice };

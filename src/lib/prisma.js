const { PrismaClient } = require('@prisma/client');

let instance = null;

function getPrismaClient() {
  if (!instance) {
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl || dbUrl.includes('placeholder') || dbUrl.includes('url-here')) {
        console.warn('[prisma] WARNING: DATABASE_URL is not configured properly.');
      }
      instance = new PrismaClient({
        log: ['error']
      });
    } catch (err) {
      console.error('[prisma] Initialization error:', err.message);
      return null;
    }
  }
  return instance;
}

// Proxy wrapper so existing calls like `prisma.user.findUnique()` work seamlessly
// and don't throw when the file is required.
const prismaProxy = new Proxy({}, {
  get(target, prop) {
    const client = getPrismaClient();
    if (!client) {
      return new Proxy({}, {
        get() {
          return async () => {
            throw new Error('DATABASE_URL is not configured. Please set DATABASE_URL in environment variables.');
          };
        }
      });
    }
    return client[prop];
  }
});

module.exports = prismaProxy;

const prisma = require('../lib/prisma.js');

const checkFeatureAccess = (featureName) => async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'ADMIN') return next();

    const feature = await prisma.featureAccess.findUnique({
      where: { feature: featureName }
    });

    if (!feature || !feature.isEnabled) {
      return res.status(403).json({ error: 'This feature is currently disabled.' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { checkFeatureAccess };

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { spendNormalCredits, addGreenCredits } = require('../services/creditEngine');
const prisma = require('../lib/prisma.js');

// GET /api/courses — list published courses
router.get('/', auth, async (req, res, next) => {
  try {
    const { type, search } = req.query;
    const where = { status: 'PUBLISHED' };

    if (type === 'free') where.isFree = true;
    if (type === 'premium') where.isPremium = true;
    if (search) where.title = { contains: search };

    const courses = await prisma.course.findMany({
      where,
      include: {
        creator: { select: { username: true } },
        _count: { select: { purchases: true, reviews: true } }
      },
      orderBy: { rankScore: 'desc' }
    });

    // Get user's purchases
    const purchases = await prisma.coursePurchase.findMany({
      where: { userId: req.user.id, status: 'ACTIVE' },
      select: { courseId: true }
    });
    const purchasedIds = new Set(purchases.map(p => p.courseId));

    res.json({
      courses: courses.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        creditPrice: c.creditPrice,
        isFree: c.isFree,
        isPremium: c.isPremium,
        creator: c.creator.username,
        purchaseCount: c._count.purchases,
        reviewCount: c._count.reviews,
        rankScore: c.rankScore,
        isPurchased: purchasedIds.has(c.id)
      }))
    });
  } catch (error) { next(error); }
});

// GET /api/courses/my — user's courses (purchased + created)
router.get('/my', auth, async (req, res, next) => {
  try {
    const [purchased, created] = await Promise.all([
      prisma.coursePurchase.findMany({
        where: { userId: req.user.id, status: 'ACTIVE' },
        include: { course: { include: { creator: { select: { username: true } } } } }
      }),
      prisma.course.findMany({
        where: { creatorId: req.user.id },
        include: { _count: { select: { purchases: true } } }
      })
    ]);

    res.json({
      purchased: purchased.map(p => p.course),
      created
    });
  } catch (error) { next(error); }
});

// GET /api/courses/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const course = await prisma.course.findFirst({
      where: { id: req.params.id, status: 'PUBLISHED' },
      include: {
        creator: { select: { username: true } },
        lessons: { orderBy: { order: 'asc' } },
        reviews: {
          where: { status: 'APPROVED' },
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        _count: { select: { purchases: true } }
      }
    });

    if (!course) return res.status(404).json({ error: 'Course not found' });

    const purchase = await prisma.coursePurchase.findFirst({
      where: { userId: req.user.id, courseId: course.id, status: 'ACTIVE' }
    });

    const avgRating = course.reviews.length > 0
      ? course.reviews.reduce((s, r) => s + r.rating, 0) / course.reviews.length
      : 0;

    res.json({
      course: {
        ...course,
        avgRating: parseFloat(avgRating.toFixed(1)),
        isPurchased: !!purchase
      }
    });
  } catch (error) { next(error); }
});

// POST /api/courses/submit — user submits a course for review
router.post('/submit', auth, async (req, res, next) => {
  try {
    const { title, description, creditPrice, isFree } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const course = await prisma.course.create({
      data: {
        creatorId: req.user.id,
        title,
        description,
        creditPrice: parseInt(creditPrice) || 0,
        isFree: !!isFree,
        status: 'PENDING'
      }
    });
    res.status(201).json({ course, message: 'Course submitted for review' });
  } catch (error) { next(error); }
});

// POST /api/courses/:id/purchase
router.post('/:id/purchase', auth, async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    const course = await prisma.course.findFirst({
      where: { id: courseId, status: 'PUBLISHED' }
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Check not already purchased
    const existing = await prisma.coursePurchase.findFirst({
      where: { userId, courseId, status: 'ACTIVE' }
    });
    if (existing) return res.status(409).json({ error: 'Already purchased' });

    // Check creator isn't buying their own course
    if (course.creatorId === userId) {
      return res.status(400).json({ error: 'Cannot purchase your own course' });
    }

    if (!course.isFree) {
      // Deduct normal credits
      await spendNormalCredits(userId, course.creditPrice, 'COURSE_PURCHASE', `Purchased: ${course.title}`, courseId);

      // Award green credits to seller (minus commission)
      const commissionSetting = await prisma.adminSetting.findUnique({ where: { key: 'platformCommission' } });
      const commission = parseInt(commissionSetting?.value || '10') / 100;
      const sellerAmount = Math.floor(course.creditPrice * (1 - commission));

      await addGreenCredits(
        course.creatorId,
        sellerAmount,
        'COURSE_SALE',
        `Course sale: ${course.title}`,
        courseId,
        true // pending
      );
    }

    const purchase = await prisma.coursePurchase.create({
      data: { userId, courseId, creditsPaid: course.isFree ? 0 : course.creditPrice }
    });

    res.status(201).json({ purchase, message: 'Course purchased successfully' });
  } catch (error) {
    if (error.message === 'Insufficient Normal Credits') {
      return res.status(400).json({ error: 'Insufficient Normal Credits' });
    }
    next(error);
  }
});

// POST /api/courses/:id/review
router.post('/:id/review', auth, async (req, res, next) => {
  try {
    const { rating, review } = req.body;
    const courseId = req.params.id;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify purchase
    const purchase = await prisma.coursePurchase.findFirst({
      where: { userId, courseId, status: 'ACTIVE' }
    });
    if (!purchase) {
      return res.status(403).json({ error: 'Only verified purchasers can review courses' });
    }

    // Check no duplicate
    const existing = await prisma.courseReview.findFirst({
      where: { userId, courseId }
    });
    if (existing) return res.status(409).json({ error: 'Already reviewed this course' });

    const courseReview = await prisma.courseReview.create({
      data: { userId, courseId, rating: parseInt(rating), review, isVerified: true }
    });

    // Update rank score
    await updateCourseRank(courseId);

    res.status(201).json({ review: courseReview });
  } catch (error) { next(error); }
});

async function updateCourseRank(courseId) {
  const [reviews, purchases] = await Promise.all([
    prisma.courseReview.findMany({ where: { courseId, status: 'APPROVED' }, select: { rating: true } }),
    prisma.coursePurchase.count({ where: { courseId } })
  ]);

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const rankScore = (avgRating * 20) + (Math.min(purchases, 100) * 0.5);

  await prisma.course.update({
    where: { id: courseId },
    data: { rankScore: parseFloat(rankScore.toFixed(2)) }
  });
}

module.exports = router;

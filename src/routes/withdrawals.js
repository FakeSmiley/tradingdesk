const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { withdrawGreenCredits } = require('../services/creditEngine');
const prisma = new PrismaClient();

// GET /api/withdrawals/my
router.get('/my', auth, async (req, res, next) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: req.user.id },
      orderBy: { requestedAt: 'desc' }
    });
    res.json({ withdrawals });
  } catch (error) { next(error); }
});

// POST /api/withdrawals/request
router.post('/request', auth, async (req, res, next) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    const settings = await prisma.adminSetting.findMany({
      where: { key: { in: ['withdrawalEnabled', 'minWithdrawal', 'maxWithdrawal'] } }
    });
    const s = {};
    settings.forEach(x => { s[x.key] = x.value; });

    if (s.withdrawalEnabled === 'false') {
      return res.status(403).json({ error: 'Withdrawals are currently disabled' });
    }

    const min = parseInt(s.minWithdrawal || '50');
    const max = parseInt(s.maxWithdrawal || '10000');
    const requestAmount = parseInt(amount);

    if (!requestAmount || requestAmount < min || requestAmount > max) {
      return res.status(400).json({ error: `Amount must be between ${min} and ${max} Green Credits` });
    }

    // Check seller account exists
    const sellerAccount = await prisma.sellerAccount.findUnique({ where: { userId } });
    if (!sellerAccount) {
      return res.status(400).json({ error: 'Please register a payment account first' });
    }

    // Check sufficient green credits
    const credits = await prisma.userCredits.findUnique({ where: { userId } });
    if (!credits || credits.withdrawableGreen < requestAmount) {
      return res.status(400).json({ error: 'Insufficient withdrawable Green Credits' });
    }

    await withdrawGreenCredits(userId, requestAmount);

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount: requestAmount,
        accountMask: sellerAccount.maskedNumber,
        status: 'PENDING'
      }
    });

    res.status(201).json({ withdrawal, message: 'Withdrawal request submitted' });
  } catch (error) { next(error); }
});

// GET /api/withdrawals/seller-account
router.get('/seller-account', auth, async (req, res, next) => {
  try {
    const account = await prisma.sellerAccount.findUnique({ where: { userId: req.user.id } });
    if (!account) return res.json({ account: null });

    // Never expose full account number
    res.json({
      account: {
        id: account.id,
        accountType: account.accountType,
        accountName: account.accountName,
        maskedNumber: account.maskedNumber,
        bankName: account.bankName,
        isVerified: account.isVerified
      }
    });
  } catch (error) { next(error); }
});

// POST /api/withdrawals/seller-account
router.post('/seller-account', auth, async (req, res, next) => {
  try {
    const { accountType, accountName, accountNumber, bankName } = req.body;
    if (!accountType || !accountName || !accountNumber) {
      return res.status(400).json({ error: 'Account type, name and number are required' });
    }

    const maskedNumber = '****' + accountNumber.slice(-4);

    const account = await prisma.sellerAccount.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        accountType,
        accountName,
        accountNumber, // In production, encrypt this
        maskedNumber,
        bankName
      },
      update: {
        accountType,
        accountName,
        accountNumber,
        maskedNumber,
        bankName
      }
    });

    res.json({
      account: {
        id: account.id,
        accountType: account.accountType,
        accountName: account.accountName,
        maskedNumber: account.maskedNumber,
        bankName: account.bankName
      }
    });
  } catch (error) { next(error); }
});

module.exports = router;

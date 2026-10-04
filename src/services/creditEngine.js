const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── CREDIT ENGINE ─────────────────────────────────────────────
async function ensureCredits(userId) {
  let credits = await prisma.userCredits.findUnique({ where: { userId } });
  if (!credits) {
    credits = await prisma.userCredits.create({ data: { userId } });
  }
  return credits;
}

async function addNormalCredits(userId, amount, source, description = '', referenceId = null) {
  if (amount <= 0) return;
  const credits = await ensureCredits(userId);

  await prisma.userCredits.update({
    where: { userId },
    data: { normalCredits: { increment: amount } }
  });

  await prisma.creditTransaction.create({
    data: {
      creditsId: credits.id,
      type: 'EARN',
      creditType: 'NORMAL',
      amount,
      source,
      description,
      referenceId,
      status: 'COMPLETED'
    }
  });
}

async function spendNormalCredits(userId, amount, source, description = '', referenceId = null) {
  const credits = await ensureCredits(userId);
  if (credits.normalCredits < amount) {
    throw new Error('Insufficient Normal Credits');
  }

  await prisma.userCredits.update({
    where: { userId },
    data: {
      normalCredits: { decrement: amount },
      usedNormal: { increment: amount }
    }
  });

  await prisma.creditTransaction.create({
    data: {
      creditsId: credits.id,
      type: 'SPEND',
      creditType: 'NORMAL',
      amount,
      source,
      description,
      referenceId,
      status: 'COMPLETED'
    }
  });
}

async function addGreenCredits(userId, amount, source, description = '', referenceId = null, pending = false) {
  if (amount <= 0) return;
  const credits = await ensureCredits(userId);

  const updateData = pending
    ? { pendingGreen: { increment: amount }, totalEarnedGreen: { increment: amount } }
    : { greenCredits: { increment: amount }, totalEarnedGreen: { increment: amount } };

  await prisma.userCredits.update({
    where: { userId },
    data: updateData
  });

  await prisma.creditTransaction.create({
    data: {
      creditsId: credits.id,
      type: 'EARN',
      creditType: 'GREEN',
      amount,
      source,
      description,
      referenceId,
      status: pending ? 'PENDING' : 'COMPLETED'
    }
  });
}

async function confirmGreenCredits(userId, amount) {
  const credits = await ensureCredits(userId);
  const toConfirm = Math.min(amount, credits.pendingGreen);
  if (toConfirm <= 0) return;

  await prisma.userCredits.update({
    where: { userId },
    data: {
      pendingGreen: { decrement: toConfirm },
      greenCredits: { increment: toConfirm },
      withdrawableGreen: { increment: toConfirm }
    }
  });
}

async function reverseGreenCredits(userId, amount, source, description = '') {
  const credits = await ensureCredits(userId);
  const toReverse = Math.min(amount, credits.pendingGreen);

  if (toReverse > 0) {
    await prisma.userCredits.update({
      where: { userId },
      data: {
        pendingGreen: { decrement: toReverse },
        totalEarnedGreen: { decrement: toReverse }
      }
    });

    await prisma.creditTransaction.create({
      data: {
        creditsId: credits.id,
        type: 'REVERSE',
        creditType: 'GREEN',
        amount: toReverse,
        source,
        description,
        status: 'REVERSED'
      }
    });
  }
}

async function withdrawGreenCredits(userId, amount) {
  const credits = await ensureCredits(userId);
  if (credits.withdrawableGreen < amount) {
    throw new Error('Insufficient withdrawable Green Credits');
  }

  await prisma.userCredits.update({
    where: { userId },
    data: {
      greenCredits: { decrement: amount },
      withdrawableGreen: { decrement: amount },
      totalWithdrawnGreen: { increment: amount }
    }
  });

  await prisma.creditTransaction.create({
    data: {
      creditsId: credits.id,
      type: 'WITHDRAW',
      creditType: 'GREEN',
      amount,
      source: 'WITHDRAWAL',
      description: 'Withdrawal request',
      status: 'PENDING'
    }
  });
}

module.exports = {
  addNormalCredits,
  spendNormalCredits,
  addGreenCredits,
  confirmGreenCredits,
  reverseGreenCredits,
  withdrawGreenCredits,
  ensureCredits
};

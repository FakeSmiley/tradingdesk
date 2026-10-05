const prisma = require('../lib/prisma.js');

// ─── AUDIT LOG ─────────────────────────────────────────────────
async function logAudit({ adminId, adminName, action, targetUserId, oldValue, newValue, reason }) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action,
        targetUserId,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        reason
      }
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

module.exports = { logAudit };

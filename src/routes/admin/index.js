const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../../middleware/auth');

// Sub-routers (stubs for now)
router.use('/dashboard', requireAdmin, (req, res) => {
  res.json({ message: 'Admin dashboard stats placeholder' });
});
router.use('/users', requireAdmin, (req, res) => {
  res.json({ message: 'Admin users management placeholder' });
});
router.use('/premium', requireAdmin, (req, res) => {
  res.json({ message: 'Admin premium management placeholder' });
});
router.use('/normal-credits', requireAdmin, (req, res) => {
  res.json({ message: 'Admin normal credits management placeholder' });
});
router.use('/green-credits', requireAdmin, (req, res) => {
  res.json({ message: 'Admin green credits management placeholder' });
});
router.use('/points', requireAdmin, (req, res) => {
  res.json({ message: 'Admin points management placeholder' });
});
router.use('/affiliate', requireAdmin, (req, res) => {
  res.json({ message: 'Admin affiliate program placeholder' });
});
router.use('/feature-access', requireAdmin, (req, res) => {
  res.json({ message: 'Admin feature access placeholder' });
});
router.use('/trial', requireAdmin, (req, res) => {
  res.json({ message: 'Admin trial management placeholder' });
});
router.use('/daily-checklist', requireAdmin, (req, res) => {
  res.json({ message: 'Admin daily checklist management placeholder' });
});
router.use('/paper-trading', requireAdmin, (req, res) => {
  res.json({ message: 'Admin paper trading settings placeholder' });
});
router.use('/trading-training', requireAdmin, (req, res) => {
  res.json({ message: 'Admin trading training placeholder' });
});
router.use('/order-flow-training', requireAdmin, (req, res) => {
  res.json({ message: 'Admin order flow training placeholder' });
});
router.use('/courses', requireAdmin, (req, res) => {
  res.json({ message: 'Admin courses management placeholder' });
});
router.use('/course-marketplace', requireAdmin, (req, res) => {
  res.json({ message: 'Admin course marketplace placeholder' });
});
router.use('/withdrawals', requireAdmin, (req, res) => {
  res.json({ message: 'Admin withdrawals management placeholder' });
});
router.use('/brokers', requireAdmin, (req, res) => {
  res.json({ message: 'Admin brokers management placeholder' });
});
router.use('/news', requireAdmin, (req, res) => {
  res.json({ message: 'Admin news management placeholder' });
});
router.use('/tips', requireAdmin, (req, res) => {
  res.json({ message: 'Admin tips management placeholder' });
});
router.use('/reports', requireAdmin, (req, res) => {
  res.json({ message: 'Admin reports placeholder' });
});
router.use('/feedback', requireAdmin, (req, res) => {
  res.json({ message: 'Admin feedback & tool request placeholder' });
});
router.use('/audit-logs', requireAdmin, (req, res) => {
  res.json({ message: 'Admin audit logs placeholder' });
});
router.use('/system-settings', requireAdmin, (req, res) => {
  res.json({ message: 'Admin system settings placeholder' });
});

module.exports = router;

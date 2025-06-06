const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/', adminController.dashboard);
router.post('/suspend/:id', adminController.suspendUser);
router.post('/unsuspend/:id', adminController.unsuspendUser);
router.post('/delete-user/:id', adminController.deleteUser);
router.post('/approve-premium/:id', adminController.approvePremium);
router.post('/reject-premium/:id', adminController.rejectPremium);

router.post('/verify-premium/:id', (req, res) => {
  const userId = req.params.id;
  const sql = `UPDATE users SET is_premium = 1, pending_premium = 0 WHERE id = ?`;

  db.query(sql, [userId], (err) => {
    if (err) return res.send('Error verifying premium');
    res.redirect('/admin');
  });
});


module.exports = router;

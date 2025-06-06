const db = require('../config/db');

exports.dashboard = (req, res) => {
  db.query('SELECT * FROM users', (err, users) => {
    if (err) return res.send('Error loading users');

    db.query('SELECT * FROM jobs', (err2, jobs) => {
      if (err2) return res.send('Error loading jobs');

      res.render('admin_dashboard', { users, jobs });
    });
  });
};
//Approve Premium
exports.approvePremium = (req, res) => {
  const userId = req.params.id;
  const sql = `
    UPDATE users 
    SET is_premium = 1, pending_premium = 0 
    WHERE id = ?
  `;
  db.query(sql, [userId], (err) => {
    if (err) return res.send('Error approving premium.');
    res.redirect('/admin');
  });
};

//Reject Premium
exports.rejectPremium = (req, res) => {
  const userId = req.params.id;
  const sql = `
    UPDATE users 
    SET pending_premium = 0 
    WHERE id = ?
  `;
  db.query(sql, [userId], (err) => {
    if (err) return res.send('Error rejecting premium.');
    res.redirect('/admin');
  });
};


//Suspend user
exports.suspendUser = (req, res) => {
  const userId = req.params.id;
  db.query('UPDATE users SET is_suspended = 1 WHERE id = ?', [userId], (err) => {
    if (err) return res.send('Error suspending user.');
    res.redirect('/admin');
  });
};


//Unsuspend user
exports.unsuspendUser = (req, res) => {
  const userId = req.params.id;
  db.query('UPDATE users SET is_suspended = 0 WHERE id = ?', [userId], (err) => {
    if (err) return res.send('Error unsuspending user.');
    res.redirect('/admin');
  });
};

//Delete User
exports.deleteUser = (req, res) => {
  const userId = req.params.id;
  db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
    if (err) return res.send('Error deleting user.');
    res.redirect('/admin');
  });
};

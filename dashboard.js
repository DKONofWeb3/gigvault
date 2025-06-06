const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const db = require('../config/db');
const { checkPremium } = require('../middleware/auth');


// Auto-redirect users to the correct dashboard based on role
router.get('/', dashboardController.viewDashboard);

// Seeker: Dashboard view with dynamic job listing (search included)
router.get('/seeker', dashboardController.viewAllJobs);

// Owner: Dashboard view
router.get('/owner', dashboardController.viewOwnerJobs);

// Show job post form (owner only)
router.get('/post-job', dashboardController.showJobForm);

// Handle job post form submission
router.post('/post-job', dashboardController.postJob);

// Seeker: Apply to a job
router.post('/apply/:jobId', dashboardController.applyToJob);

// View single job
router.get('/job/:id', dashboardController.viewSingleJob);

// View applicants for a job
router.get('/job/:jobId/applicants', dashboardController.viewApplicants);

// Owner Accepts Applicants
router.post('/job/:jobId/accept/:seekerId', (req, res) => {
  const jobId = req.params.jobId;
  const seekerId = req.params.seekerId;

  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.status(403).send('Access denied.');
  }

  // First, set all others to rejected (optional)
  const rejectOthersQuery = `
    UPDATE applications
    SET status = 'rejected'
    WHERE job_id = ? AND seeker_id != ?
  `;

  db.query(rejectOthersQuery, [jobId, seekerId], (err) => {
    if (err) return res.send('Error rejecting other applicants.');

    // Now accept the chosen seeker
    const acceptQuery = `
      UPDATE applications
      SET status = 'accepted'
      WHERE job_id = ? AND seeker_id = ?
    `;

    db.query(acceptQuery, [jobId, seekerId], (err2) => {
      if (err2) return res.send('Error accepting applicant.');

      // ✅ Add a notification to the seeker
      const notifyQuery = `
        INSERT INTO notifications (user_id, message, type)
        VALUES (?, ?, ?)
      `;
      const message = '🎉 You’ve been accepted for a job! Check your dashboard.';

      db.query(notifyQuery, [seekerId, message, 'job_accept'], (err3) => {
        if (err3) return res.send('Error sending notification.');

        res.redirect(`/dashboard/job/${jobId}/applicants`);
      });
    });
  });
});


// Premium page
router.get('/premium', (req, res) => {
  res.render('premium', { user: req.session.user });
});


// Premium-only jobs page
router.get('/exclusive-jobs', checkPremium, (req, res) => {
  res.render('exclusive_jobs', { user: req.session.user });
});

// Premium-only job list from DB
router.get('/premium-jobs', (req, res) => {
  if (!req.session.user || !req.session.user.is_premium) {
    return res.send('Access denied. Premium members only.');
  }

  db.query(
    'SELECT jobs.*, users.username AS owner_name FROM jobs JOIN users ON jobs.owner_id = users.id WHERE jobs.is_premium = 1 ORDER BY jobs.created_at DESC',
    (err, results) => {
      if (err) return res.send('Error loading premium jobs.');
      res.render('premium_jobs', { user: req.session.user, jobs: results });
    }
  );
});

// Premium-only analytics page
router.get('/exclusive-analytics', checkPremium, dashboardController.premiumAnalytics);

//Recommended jobs
router.get('/recommended-jobs', checkPremium, dashboardController.recommendedJobs);

// Fund wallet (POST)
router.post('/fund-wallet', dashboardController.fundWallet);

// Transfer to seeker (POST)
router.post('/transfer-funds', dashboardController.transferToSeeker);



// Show edit showcase form
router.get('/edit-showcase', checkPremium, (req, res) => {
  res.render('edit_showcase', { user: req.session.user });
});

// Handle showcase form submission
router.post('/edit-showcase', checkPremium, (req, res) => {
  const userId = req.session.user.id;
  const showcase = req.body.showcase;

  db.query('UPDATE users SET showcase = ? WHERE id = ?', [showcase, userId], (err) => {
    if (err) return res.send('Error updating showcase.');
    req.session.user.showcase = showcase; // Update session
    res.redirect('/dashboard');
  });
});

// Mark a notification as read or delete
router.post('/notifications/:id/delete', (req, res) => {
  const notificationId = req.params.id;
  const userId = req.session.user?.id;

  if (!userId) return res.status(403).send('Not logged in');

  db.query(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId],
    (err) => {
      if (err) return res.send('Failed to delete notification');
      res.redirect('/dashboard/seeker');
    }
  );
});


//Network
router.get('/premium-network', checkPremium, (req, res) => {
  res.render('premium_network', { user: req.session.user });
});


module.exports = router;

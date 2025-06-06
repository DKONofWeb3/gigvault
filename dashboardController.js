const db = require('../config/db');

// Auto route users to correct dashboard
exports.viewDashboard = (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const user = req.session.user;

  if (user.role === 'seeker') {
    return res.redirect('/dashboard/seeker');
  } else if (user.role === 'owner') {
    return res.redirect('/dashboard/owner');
  }

  return res.redirect('/login');
};

// Show form to post a job (owner only)
exports.showJobForm = (req, res) => {
  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.send('Access denied.');
  }

  res.render('postJob');
};

// Handle job posting (owner only)
exports.postJob = (req, res) => {
  const { title, description, budget } = req.body;
  const owner_id = req.session.user.id;

  db.query(
    'INSERT INTO jobs (title, description, budget, owner_id) VALUES (?, ?, ?, ?)',
    [title, description, budget, owner_id],
    (err) => {
      if (err) return res.send('Error posting job: ' + err.message);
      res.redirect('/dashboard/owner');
    }
  );
};

// Seeker: view all available jobs
exports.viewAllJobs = (req, res) => {
  if (!req.session.user || req.session.user.role !== 'seeker') {
    return res.send('Access denied.');
  }

  const user = req.session.user;
  const searchQuery = req.query.search || '';

  let sql = `
    SELECT jobs.*, users.username AS owner_name
    FROM jobs
    JOIN users ON jobs.owner_id = users.id
  `;

  const conditions = [];
  const params = [];

  if (!user.is_premium) {
    conditions.push(`jobs.created_at < NOW() - INTERVAL 5 HOUR`);
  }

  if (searchQuery) {
    conditions.push(`(jobs.title LIKE ? OR jobs.description LIKE ?)`);
    const wildcard = `%${searchQuery}%`;
    params.push(wildcard, wildcard);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY jobs.created_at DESC';

  db.query(sql, params, (err, jobResults) => {
    if (err) return res.send('Error fetching jobs.');

    db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [user.id],
      (err2, notifications) => {
        if (err2) return res.send('Error loading notifications.');

        db.query(
          'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
          [user.id],
          (err3, transactions) => {
            if (err3) return res.send('Error loading transactions.');

            db.query('SELECT wallet_balance FROM users WHERE id = ?', [user.id], (err4, result) => {
              const balance = parseFloat(result?.[0]?.wallet_balance) || 0;

              res.render('seeker_dashboard', {
                user,
                jobs: jobResults,
                notifications,
                transactions,
                balance
              });
            });
          }
        );
      }
    );
  });
};

// Seeker: apply to a job
exports.applyToJob = (req, res) => {
  if (!req.session.user || req.session.user.role !== 'seeker') {
    return res.send('Access denied.');
  }

  const jobId = req.params.jobId;
  const seekerId = req.session.user.id;
  const message = req.body.message || '';

  db.query(
    'INSERT INTO applications (job_id, seeker_id, message) VALUES (?, ?, ?)',
    [jobId, seekerId, message],
    (err) => {
      if (err) return res.send('Error applying: ' + err.message);
      res.redirect(`/dashboard/job/${jobId}?success=1`);
    }
  );
};

// Seeker: view single job details
exports.viewSingleJob = (req, res) => {
  if (!req.session.user || req.session.user.role !== 'seeker') {
    return res.redirect('/login');
  }

  const jobId = req.params.id;
  const success = req.query.success;

  const sql = `
    SELECT jobs.*, users.username AS owner_name
    FROM jobs
    JOIN users ON jobs.owner_id = users.id
    WHERE jobs.id = ?
  `;

  db.query(sql, [jobId], (err, results) => {
    if (err || results.length === 0) {
      return res.send('Job not found.');
    }

    res.render('job_details', {
      user: req.session.user,
      job: results[0],
      success
    });
  });
};

// View owner jobs
exports.viewOwnerJobs = (req, res) => {
  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.redirect('/login');
  }

  const ownerId = req.session.user.id;

  db.query(
    'SELECT * FROM jobs WHERE owner_id = ? ORDER BY created_at DESC',
    [ownerId],
    (err, jobs) => {
      if (err) return res.send('Error loading jobs');

      const applicantQuery = `
        SELECT a.*, u.username AS seeker_name
        FROM applications a
        JOIN users u ON a.seeker_id = u.id
        JOIN jobs j ON a.job_id = j.id
        WHERE j.owner_id = ?
        ORDER BY a.created_at DESC
        LIMIT 5
      `;

      db.query(applicantQuery, [ownerId], (err2, recentApplicants) => {
        if (err2) return res.send('Error fetching recent applicants');

        db.query(
          'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
          [ownerId],
          (err3, transactions) => {
            if (err3) return res.send('Error loading transactions');

            db.query('SELECT wallet_balance FROM users WHERE id = ?', [ownerId], (err4, result) => {
              if (err4) return res.send('Error fetching wallet balance');

              const balance = parseFloat(result?.[0]?.wallet_balance) || 0;

              res.render('owner_dashboard', {
                user: req.session.user,
                jobs,
                recentApplicants,
                transactions,
                balance
              });
            });
          }
        );
      });
    }
  );
};


// Owner: view applicants for a specific job
exports.viewApplicants = (req, res) => {
  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.redirect('/login');
  }

  const jobId = req.params.jobId;

  const sql = `
    SELECT applications.*, users.username AS seeker_name, users.is_premium
    FROM applications
    JOIN users ON applications.seeker_id = users.id
    WHERE applications.job_id = ?
    ORDER BY users.is_premium DESC, applications.id DESC
  `;

  db.query(sql, [jobId], (err, results) => {
    if (err) {
      console.error('Error fetching applicants:', err);
      return res.send('Error fetching applicants.');
    }

    res.render('applicants', {
      user: req.session.user,
      applicants: results
    });
  });
};

//Accept Applicants
exports.acceptApplicant = (req, res) => {
  const jobId = req.params.jobId;
  const seekerId = req.params.seekerId;
  const ownerId = req.session.user.id;

  const updateSQL = `UPDATE applications SET status = 'accepted' WHERE job_id = ? AND seeker_id = ?`;

  db.query(updateSQL, [jobId, seekerId], (err) => {
    if (err) return res.send('Error accepting applicant');

    // Insert notification
    const notifySQL = `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`;
    const message = `🎉 You've been accepted for a job! Check it out now.`;

    db.query(notifySQL, [seekerId, message, 'job_accept'], (err2) => {
      if (err2) return res.send('Error sending notification');
      res.redirect(`/dashboard/job/${jobId}/applicants`);
    });
  });
};



// Premium Analytics (Seeker & Owner)
exports.premiumAnalytics = (req, res) => {
  const user = req.session.user;
  const userId = user.id;

  const queries = {
    seeker: {
      totalApplied: `SELECT COUNT(*) AS total FROM applications WHERE seeker_id = ?`,
      jobsWon: `SELECT COUNT(*) AS won FROM applications WHERE seeker_id = ? AND status = 'accepted'`,
    },
    owner: {
      totalPosted: `SELECT COUNT(*) AS total FROM jobs WHERE owner_id = ?`,
      totalApplications: `SELECT COUNT(*) AS total FROM applications WHERE job_id IN (SELECT id FROM jobs WHERE owner_id = ?)`,
      latestPost: `SELECT title FROM jobs WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1`
    },
    totalJobs: `SELECT COUNT(*) AS total FROM jobs`,
    categoryBreakdown: `SELECT category, COUNT(*) AS count FROM jobs GROUP BY category`
  };

  const stats = {};

  // Shared queries
  db.query(queries.totalJobs, (err, totalRes) => {
    if (err) return res.send('Error loading analytics');
    stats.totalJobs = totalRes[0].total;

    db.query(queries.categoryBreakdown, (err, catRes) => {
      if (err) return res.send('Error loading analytics');
      stats.categoryStats = catRes;

      if (user.role === 'seeker') {
        db.query(queries.seeker.totalApplied, [userId], (err, appRes) => {
          if (err) return res.send('Error loading analytics');
          stats.applied = appRes[0].total;

          db.query(queries.seeker.jobsWon, [userId], (err, wonRes) => {
            if (err) return res.send('Error loading analytics');
            stats.won = wonRes[0].won;

            res.render('exclusive_analytics', { user, stats });
          });
        });

      } else if (user.role === 'owner') {
        db.query(queries.owner.totalPosted, [userId], (err, postRes) => {
          if (err) return res.send('Error loading analytics');
          stats.posted = postRes[0].total;

          db.query(queries.owner.totalApplications, [userId], (err, appRes) => {
            if (err) return res.send('Error loading analytics');
            stats.applications = appRes[0].total;

            db.query(queries.owner.latestPost, [userId], (err, latestRes) => {
              if (err) return res.send('Error loading analytics');
              stats.latest = latestRes[0]?.title || 'N/A';

              res.render('exclusive_analytics', { user, stats });
            });
          });
        });
      }
    });
  });
};

exports.recommendedJobs = (req, res) => {
  const userId = req.session.user.id;

  const appliedCategoryQuery = `
    SELECT DISTINCT jobs.category 
    FROM applications 
    JOIN jobs ON applications.job_id = jobs.id 
    WHERE applications.seeker_id = ?
  `;

  db.query(appliedCategoryQuery, [userId], (err, catRes) => {
    if (err) {
      console.error('Error fetching user categories:', err);
      return res.send('Error loading recommendations');
    }

    if (catRes.length === 0) {
      return res.render('recommended_jobs', {
        user: req.session.user,
        jobs: [],
        message: 'No recommendations yet. Apply to jobs to get tailored suggestions.'
      });
    }

    const categories = catRes.map(row => row.category);
    const placeholders = categories.map(() => '?').join(', ');

    const jobQuery = `
      SELECT jobs.*, users.username AS owner_name 
      FROM jobs 
      JOIN users ON jobs.owner_id = users.id 
      WHERE category IN (${placeholders}) 
      ORDER BY jobs.created_at DESC
    `;

    db.query(jobQuery, categories, (err, jobRes) => {
      if (err) {
        console.error('Error fetching recommended jobs:', err);
        return res.send('Error loading recommendations');
      }

      res.render('recommended_jobs', {
        user: req.session.user,
        jobs: jobRes,
        message: null
      });
    });
  });
};

// Fund Wallet
exports.fundWallet = (req, res) => {
  const userId = req.session.user.id;
  const amount = parseFloat(req.body.amount);

  if (isNaN(amount) || amount <= 0) {
    return res.send('Invalid funding amount.');
  }

  db.query(
    'UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?',
    [amount, userId],
    (err) => {
      if (err) return res.send('Error funding wallet.');

      // Record transaction
      db.query(
        'INSERT INTO transactions (user_id, type, amount, note) VALUES (?, "credit", ?, "Wallet funded")',
        [userId, amount],
        (err2) => {
          if (err2) console.error('Error logging funding transaction:', err2);
          res.redirect('/dashboard/owner');
        }
      );
    }
  );
};

// Transfer from Owner to Seeker
exports.transferToSeeker = (req, res) => {
  const ownerId = req.session.user.id;
  const { seeker_id: seekerId, amount } = req.body;
  const parsedAmount = parseFloat(amount);

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.send('Invalid amount.');
  }

  db.query('SELECT wallet_balance FROM users WHERE id = ?', [ownerId], (err, result) => {
    if (err || result.length === 0) return res.send('Error fetching balance.');

    const balance = result[0].wallet_balance;
    if (balance < parsedAmount) return res.send('Insufficient balance.');

    // Deduct from owner
    db.query('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?', [parsedAmount, ownerId], (err2) => {
      if (err2) return res.send('Error deducting from owner.');

      // Credit seeker
      db.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [parsedAmount, seekerId], (err3) => {
        if (err3) return res.send('Error crediting seeker.');

        // Log both transactions
        const tx1 = `INSERT INTO transactions (user_id, type, amount, note) VALUES (?, 'debit', ?, ?)`;
        const tx2 = `INSERT INTO transactions (user_id, type, amount, note) VALUES (?, 'credit', ?, ?)`;

        db.query(tx1, [ownerId, parsedAmount, `Paid seeker ID ${seekerId}`], (err4) => {
          if (err4) console.error('Error logging owner transaction:', err4);

          db.query(tx2, [seekerId, parsedAmount, `Received from owner ID ${ownerId}`], (err5) => {
            if (err5) console.error('Error logging seeker transaction:', err5);
            res.redirect('/dashboard/owner');
          });
        });
      });
    });
  });
};
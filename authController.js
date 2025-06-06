const bcrypt = require('bcryptjs');
const db = require('../config/db');

// REGISTER NEW USER
exports.register = (req, res) => {
  const { username, email, password, role } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.query(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [username, email, hashedPassword, role],
    (err) => {
      if (err) return res.send('Registration Error: ' + err.message);
      res.redirect('/login');
    }
  );
};

// LOGIN
exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err || results.length === 0) return res.send('Invalid login');

    const user = results[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) return res.send('Incorrect password');

    // 🔒 Check if account is suspended
    if (user.is_suspended == 1) {
      return res.send('Account Suspended. Contact support.');
    }

    // ✅ Store session
    req.session.user = user;

    // 🧑‍💻 Redirect admin or regular user
    if (user.is_admin == 1) {
      return res.redirect('/admin');
    } else {
      return res.redirect('/dashboard');
    }
  });
};

// LOGOUT
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};

const express = require('express'); 
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Set EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', require('./routes/auth'));

// Dashboard routes
const dashboardRoutes = require('./routes/dashboard');
app.use('/dashboard', dashboardRoutes);

// Seeker Dashboard
app.get('/dashboard/seeker', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'seeker') {
    return res.redirect('/login');
  }
  res.render('seeker_dashboard', { user: req.session.user });
});

// Owner Dashboard
app.get('/dashboard/owner', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.redirect('/login');
  }
  res.render('owner_dashboard', { user: req.session.user });
});


//Admin Dashboard
app.use('/admin', require('./routes/admin'));


// Server
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Show login page
router.get('/login', (req, res) => {
  res.render('login');
});

// Show registration page
router.get('/register', (req, res) => {
  res.render('register');
});

// Handle login
router.post('/login', authController.login);

// Handle registration
router.post('/register', authController.register);

// Logout
router.get('/logout', authController.logout);

module.exports = router;

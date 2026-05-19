const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Board = require('../models/Board');

const router = express.Router();

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Check if user exists (pre-registration validation)
router.post('/check', async (req, res) => {
  try {
    const { username, email } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'A user with this email already exists.' });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: 'This username is already taken.' });

    res.json({ available: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, theme, permEmails, permTelemetry } = req.body;

    // Validate Username (Min 8 chars, alphanumeric only)
    const usernameRegex = /^[a-zA-Z0-9]{8,}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: 'Username must be at least 8 characters and contain only letters and numbers.' });
    }

    // Validate Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Validate Password (Min 8 chars, uppercase, lowercase, special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+={}\[\]:;"'<>,.?/\\|~`\-]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long, including uppercase, lowercase, and a special character.' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      username,
      email,
      password: hashedPassword,
      theme: theme || 'dark',
      permEmails: permEmails ? 1 : 0,
      permTelemetry: permTelemetry ? 1 : 0
    });
    await user.save();

    // Initialize empty board for the user
    const board = new Board({ userId: user._id });
    await board.save();

    // Create JWT
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    // Create JWT
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Change Password Route
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Check if user exists
    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Validate current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

    // Validate new password format
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+={}\[\]:;"'<>,.?/\\|~`\-]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long, including uppercase, lowercase, and a special character.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Update Avatar Route
router.put('/avatar', authenticateToken, async (req, res) => {
  try {
    const { avatar } = req.body;
    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.avatar = avatar;
    await user.save();

    res.json({ message: 'Avatar updated successfully', user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});
// Get Permissions Route
router.get('/permissions', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('permEmails permTelemetry theme');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ permEmails: user.permEmails, permTelemetry: user.permTelemetry, theme: user.theme });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update Permissions Route
router.put('/permissions', authenticateToken, async (req, res) => {
  try {
    const { permEmails, permTelemetry } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (permEmails !== undefined) user.permEmails = permEmails ? 1 : 0;
    if (permTelemetry !== undefined) user.permTelemetry = permTelemetry ? 1 : 0;
    await user.save();

    res.json({ message: 'Permissions updated', permEmails: user.permEmails, permTelemetry: user.permTelemetry });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;

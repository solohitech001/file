const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../models/User');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Registration Route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create new user
    user = new User({ username, email, password });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user to database
    await user.save();

    res.status(201).json({ msg: 'User registered successfully', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Generate JWT
    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      'yourSecretToken', // Replace with your JWT secret
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// File Upload Route
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      const { email } = req.body;
  
      if (!req.file) {
        return res.status(400).json({ msg: 'No file uploaded' });
      }
  
      // Find user by email and update files array
      const user = await User.findOneAndUpdate(
        { email },
        { $push: { files: req.file.filename } },
        { new: true }
      );
  
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
  
      res.status(201).json({
        msg: 'File uploaded successfully',
        file: req.file.filename,
        path: path.join(__dirname, '../uploads', req.file.filename),
        user,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  
  // Fetch User Files Route
  router.get('/files', async (req, res) => {
    try {
      const { email } = req.query;
  
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
  
      res.status(200).json({ files: user.files });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  
module.exports = router;

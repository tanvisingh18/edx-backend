const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const router = express.Router();

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { full_name, email, password, public_username, country_code } = req.body;
    
    // Check if user exists
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Insert user
    const [result] = await db.query(
      `INSERT INTO users (full_name, public_username, email, password_hash, 
                          country_code, is_active, accepts_tos_at) 
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [full_name, public_username, email, password_hash, country_code]
    );

    res.status(201).json({ 
      message: 'User registered successfully',
      user_id: result.insertId 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE user_id = ?',
      [req.ip, user.user_id]
    );

    // Generate JWT
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        email: user.email,
        is_staff: user.is_staff,
        is_instructor: user.is_instructor
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        is_staff: user.is_staff,
        is_instructor: user.is_instructor
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});
const { authenticateToken } = require('../middleware/auth');

// GET USER PROFILE
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT user_id, full_name, email, public_username, display_name,
              country_code, timezone, locale, profile_bio, profile_image_url
       FROM users WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// UPDATE USER PROFILE
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { 
      full_name, display_name, profile_bio, country_code, 
      timezone
    } = req.body;
    
    await db.query(
      `UPDATE users 
       SET full_name = ?, display_name = ?, profile_bio = ?, 
           country_code = ?, timezone = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [full_name, display_name, profile_bio, country_code, timezone, req.user.user_id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
const express = require('express');
const db = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

// GET all users (admin only)
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT user_id, full_name, email, public_username, country_code, 
             is_active, is_instructor, created_at, last_login_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET platform statistics
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [totalUsers] = await db.query('SELECT COUNT(*) as count FROM users');
    const [totalCourses] = await db.query('SELECT COUNT(*) as count FROM courses WHERE is_active = 1');
    const [totalEnrollments] = await db.query('SELECT COUNT(*) as count FROM enrollments');
    const [totalRevenue] = await db.query('SELECT SUM(amount) as total FROM transactions WHERE status = "completed"');

    res.json({
      total_users: totalUsers[0].count,
      total_courses: totalCourses[0].count,
      total_enrollments: totalEnrollments[0].count,
      total_revenue: totalRevenue[0].total || 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// POST create new course (admin/instructor)
router.post('/courses', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { course_key, title, short_description, provider_id, level, default_price } = req.body;
    
    const [result] = await db.query(
      `INSERT INTO courses (course_key, title, short_description, provider_id, level, default_price)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [course_key, title, short_description, provider_id, level, default_price]
    );

    res.status(201).json({ 
      message: 'Course created successfully',
      course_id: result.insertId 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

module.exports = router;
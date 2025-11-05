const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET user enrollments
router.get('/my-courses', authenticateToken, async (req, res) => {
  try {
    const [enrollments] = await db.query(`
      SELECT e.*, c.title, c.course_key, cr.run_key, cr.start_date, cr.end_date,
             p.name as provider_name
      FROM enrollments e
      JOIN course_runs cr ON e.run_id = cr.run_id
      JOIN courses c ON cr.course_id = c.course_id
      JOIN providers p ON c.provider_id = p.provider_id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `, [req.user.user_id]);

    res.json(enrollments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// POST enroll in course
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { run_id, enrollment_mode } = req.body;
    
    // Check if already enrolled
    const [existing] = await db.query(
      'SELECT * FROM enrollments WHERE run_id = ? AND user_id = ?',
      [run_id, req.user.user_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Insert enrollment
    const [result] = await db.query(
      `INSERT INTO enrollments (run_id, user_id, enrollment_mode, enrollment_source) 
       VALUES (?, ?, ?, 'web')`,
      [run_id, req.user.user_id, enrollment_mode || 'audit']
    );

    res.status(201).json({ 
      message: 'Enrolled successfully',
      enrollment_id: result.insertId 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

module.exports = router;
const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET all active courses
router.get('/', async (req, res) => {
  try {
    const [courses] = await db.query(`
      SELECT c.*, p.name as provider_name, p.logo_url,
             COUNT(DISTINCT e.user_id) as enrollment_count
      FROM courses c
      JOIN providers p ON c.provider_id = p.provider_id
      LEFT JOIN course_runs cr ON c.course_id = cr.course_id
      LEFT JOIN enrollments e ON cr.run_id = e.run_id
      WHERE c.is_active = 1
      GROUP BY c.course_id
    `);
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET course details
router.get('/:course_id', async (req, res) => {
  try {
    const [courses] = await db.query(`
      SELECT c.*, p.name as provider_name, p.website_url
      FROM courses c
      JOIN providers p ON c.provider_id = p.provider_id
      WHERE c.course_id = ?
    `, [req.params.course_id]);

    if (courses.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get course runs
    const [runs] = await db.query(`
      SELECT * FROM course_runs 
      WHERE course_id = ? AND is_published = 1
      ORDER BY start_date DESC
    `, [req.params.course_id]);

    res.json({ ...courses[0], runs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch course details' });
  }
});

module.exports = router;
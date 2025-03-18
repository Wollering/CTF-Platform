const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { authenticate, isAdmin } = require('../middleware/auth');

// @route   POST /api/submissions
// @desc    Submit a flag for a challenge
// @access  Private
router.post('/', authenticate, submissionController.submitFlag);

// @route   GET /api/submissions/user
// @desc    Get submissions for the current user
// @access  Private
router.get('/user', authenticate, submissionController.getUserSubmissions);

// @route   GET /api/submissions/team/:teamId
// @desc    Get submissions for a specific team
// @access  Admin
router.get('/team/:teamId', authenticate, isAdmin, submissionController.getTeamSubmissions);

// @route   GET /api/submissions
// @desc    Get all submissions
// @access  Admin
router.get('/', authenticate, isAdmin, submissionController.getAllSubmissions);

// @route   GET /api/submissions/stats
// @desc    Get submission statistics
// @access  Admin
router.get('/stats', authenticate, isAdmin, submissionController.getSubmissionStats);

module.exports = router;

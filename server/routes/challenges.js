const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challengeController');
const { authenticate, isAdmin } = require('../middleware/auth');

// @route   GET /api/challenges
// @desc    Get all visible challenges with solved status for authenticated user
// @access  Private
router.get('/', authenticate, challengeController.getChallenges);

// @route   GET /api/challenges/:id
// @desc    Get a specific challenge
// @access  Private
router.get('/:id', authenticate, challengeController.getChallenge);

// @route   POST /api/challenges
// @desc    Create a new challenge
// @access  Admin
router.post('/', authenticate, isAdmin, challengeController.createChallenge);

// @route   PUT /api/challenges/:id
// @desc    Update a challenge
// @access  Admin
router.put('/:id', authenticate, isAdmin, challengeController.updateChallenge);

// @route   DELETE /api/challenges/:id
// @desc    Delete a challenge
// @access  Admin
router.delete('/:id', authenticate, isAdmin, challengeController.deleteChallenge);

// @route   POST /api/challenges/:id/files
// @desc    Upload a file for a challenge
// @access  Admin
router.post('/:id/files', authenticate, isAdmin, challengeController.uploadFile);

// @route   GET /api/challenges/all
// @desc    Get all challenges (including hidden ones)
// @access  Admin
router.get('/all', authenticate, isAdmin, challengeController.getAllChallenges);

module.exports = router;

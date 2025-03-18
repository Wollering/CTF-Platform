const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/teams
// @desc    Get all teams
// @access  Private
router.get('/', authenticate, teamController.getTeams);

// @route   GET /api/teams/:id
// @desc    Get a specific team
// @access  Private
router.get('/:id', authenticate, teamController.getTeam);

// @route   POST /api/teams
// @desc    Create a new team
// @access  Private
router.post('/', authenticate, teamController.createTeam);

// @route   POST /api/teams/join
// @desc    Join an existing team
// @access  Private
router.post('/join', authenticate, teamController.joinTeam);

// @route   GET /api/teams/leaderboard
// @desc    Get team leaderboard
// @access  Private
router.get('/leaderboard', authenticate, teamController.getLeaderboard);

module.exports = router;

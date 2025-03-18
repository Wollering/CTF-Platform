const Team = require('../models/Team');
const User = require('../models/User');
const Submission = require('../models/Submission');
const mongoose = require('mongoose');

// Get all teams
exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find();
    res.status(200).json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving teams'
    });
  }
};

// Get a specific team
exports.getTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Get team members
    const members = await User.find({ team: team._id }).select('username');
    
    // Get team stats
    const stats = await getTeamStats(team._id);
    
    // Combine team data with stats
    const teamData = {
      ...team.toObject(),
      members,
      stats
    };
    
    res.status(200).json(teamData);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving team'
    });
  }
};

// Create a new team (only when registering a new user)
exports.createTeam = async (req, res) => {
  try {
    const { name } = req.body;
    
    // Check if team name already exists
    const existingTeam = await Team.findOne({ name });
    
    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: 'Team name already exists'
      });
    }
    
    // Create a new team
    const team = new Team({
      name,
      createdBy: req.user.id
    });
    
    await team.save();
    
    // Update the user to be part of this team
    const user = await User.findById(req.user.id);
    user.team = team._id;
    await user.save();
    
    res.status(201).json(team);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating team'
    });
  }
};

// Join an existing team
exports.joinTeam = async (req, res) => {
  try {
    const { teamId } = req.body;
    
    // Check if team exists
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Update the user to be part of this team
    const user = await User.findById(req.user.id);
    
    // Check if user is already in a team
    if (user.team) {
      return res.status(400).json({
        success: false,
        message: 'You are already part of a team'
      });
    }
    
    user.team = team._id;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: `Successfully joined team ${team.name}`,
      team
    });
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error joining team'
    });
  }
};

// Get team leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    // Aggregate team scores
    const leaderboard = await Submission.aggregate([
      // Only include correct submissions
      { $match: { correct: true } },
      
      // Group by team and calculate total points
      {
        $lookup: {
          from: 'challenges',
          localField: 'challenge',
          foreignField: '_id',
          as: 'challengeDetails'
        }
      },
      { $unwind: '$challengeDetails' },
      {
        $group: {
          _id: '$team',
          points: { $sum: '$challengeDetails.points' },
          solvedChallenges: { $addToSet: '$challenge' }
        }
      },
      
      // Sort by points in descending order
      { $sort: { points: -1 } },
      
      // Lookup team details
      {
        $lookup: {
          from: 'teams',
          localField: '_id',
          foreignField: '_id',
          as: 'teamDetails'
        }
      },
      { $unwind: '$teamDetails' },
      
      // Format the response
      {
        $project: {
          _id: 1,
          name: '$teamDetails.name',
          points: 1,
          solvedChallenges: { $size: '$solvedChallenges' }
        }
      }
    ]);
    
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving leaderboard'
    });
  }
};

// Helper function to get team statistics
const getTeamStats = async (teamId) => {
  try {
    // Get solved challenges
    const solvedChallenges = await Submission.find({
      team: teamId,
      correct: true
    }).populate('challenge', 'title category difficulty points');
    
    // Calculate points by category
    const pointsByCategory = solvedChallenges.reduce((acc, submission) => {
      const category = submission.challenge.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += submission.challenge.points;
      return acc;
    }, {});
    
    // Calculate total points
    const totalPoints = Object.values(pointsByCategory).reduce((sum, points) => sum + points, 0);
    
    // Count challenges by difficulty
    const challengesByDifficulty = solvedChallenges.reduce((acc, submission) => {
      const difficulty = submission.challenge.difficulty;
      if (!acc[difficulty]) {
        acc[difficulty] = 0;
      }
      acc[difficulty]++;
      return acc;
    }, {});
    
    return {
      totalPoints,
      solvedCount: solvedChallenges.length,
      pointsByCategory,
      challengesByDifficulty
    };
  } catch (error) {
    console.error('Get team stats error:', error);
    throw error;
  }
};

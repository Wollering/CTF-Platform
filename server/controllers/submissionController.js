const Submission = require('../models/Submission');
const Challenge = require('../models/Challenge');
const User = require('../models/User');

// Submit a flag for a challenge
exports.submitFlag = async (req, res) => {
  try {
    const { challengeId, flag } = req.body;
    
    if (!challengeId || !flag) {
      return res.status(400).json({
        success: false,
        message: 'Challenge ID and flag are required'
      });
    }
    
    // Get the challenge
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Check if the user already solved this challenge
    const alreadySolved = await Submission.hasSolved(req.user.id, challengeId);
    
    if (alreadySolved) {
      return res.status(400).json({
        success: false,
        message: 'You have already solved this challenge'
      });
    }
    
    // Check if the flag is correct
    const isCorrect = challenge.checkFlag(flag);
    
    // Get user's team
    const user = await User.findById(req.user.id);
    
    if (!user || !user.team) {
      return res.status(400).json({
        success: false,
        message: 'User must be part of a team to submit flags'
      });
    }
    
    // Create submission record
    const submission = new Submission({
      user: req.user.id,
      team: user.team,
      challenge: challengeId,
      flag,
      correct: isCorrect,
      ip: req.ip
    });
    
    await submission.save();
    
    // Return appropriate response based on whether flag was correct
    if (isCorrect) {
      return res.status(200).json({
        success: true,
        message: 'Correct flag! Challenge solved.',
        points: challenge.points
      });
    } else {
      return res.status(200).json({
        success: false,
        message: 'Incorrect flag. Try again.'
      });
    }
  } catch (error) {
    console.error('Flag submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing submission'
    });
  }
};

// Get submissions for the current user
exports.getUserSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      user: req.user.id,
      correct: true
    })
    .populate({
      path: 'challenge',
      select: 'title category difficulty points'
    })
    .sort({ createdAt: -1 });
    
    res.status(200).json(submissions);
  } catch (error) {
    console.error('Get user submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving submissions'
    });
  }
};

// Get submissions for a specific team (admin only)
exports.getTeamSubmissions = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const submissions = await Submission.find({
      team: teamId
    })
    .populate({
      path: 'challenge',
      select: 'title category difficulty points'
    })
    .populate({
      path: 'user',
      select: 'username'
    })
    .sort({ createdAt: -1 });
    
    res.status(200).json(submissions);
  } catch (error) {
    console.error('Get team submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving team submissions'
    });
  }
};

// Get all submissions (admin only)
exports.getAllSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find()
      .populate({
        path: 'challenge',
        select: 'title category difficulty points'
      })
      .populate({
        path: 'user',
        select: 'username'
      })
      .populate({
        path: 'team',
        select: 'name'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json(submissions);
  } catch (error) {
    console.error('Get all submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving submissions'
    });
  }
};

// Get submission statistics (admin only)
exports.getSubmissionStats = async (req, res) => {
  try {
    const stats = await Submission.aggregate([
      {
        $group: {
          _id: '$correct',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const correctCount = stats.find(s => s._id === true)?.count || 0;
    const incorrectCount = stats.find(s => s._id === false)?.count || 0;
    
    // Get stats by challenge
    const challengeStats = await Submission.aggregate([
      {
        $match: { correct: true }
      },
      {
        $group: {
          _id: '$challenge',
          solveCount: { $sum: 1 },
          users: { $addToSet: '$user' }
        }
      },
      {
        $lookup: {
          from: 'challenges',
          localField: '_id',
          foreignField: '_id',
          as: 'challengeDetails'
        }
      },
      {
        $unwind: '$challengeDetails'
      },
      {
        $project: {
          _id: 1,
          solveCount: 1,
          uniqueUsers: { $size: '$users' },
          title: '$challengeDetails.title',
          category: '$challengeDetails.category',
          difficulty: '$challengeDetails.difficulty'
        }
      },
      {
        $sort: { solveCount: -1 }
      }
    ]);
    
    res.status(200).json({
      total: correctCount + incorrectCount,
      correct: correctCount,
      incorrect: incorrectCount,
      successRate: correctCount / (correctCount + incorrectCount) * 100,
      challengeStats
    });
  } catch (error) {
    console.error('Get submission stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving submission statistics'
    });
  }
};

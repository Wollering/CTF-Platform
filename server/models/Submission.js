const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  flag: {
    type: String,
    required: true,
    trim: true
  },
  correct: {
    type: Boolean,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  ip: {
    type: String,
    trim: true
  }
});

// Index for faster lookups
SubmissionSchema.index({ user: 1, challenge: 1 });
SubmissionSchema.index({ team: 1, challenge: 1 });

// Index for sorting by creation date
SubmissionSchema.index({ createdAt: -1 });

// Static method to check if a user has already solved a challenge
SubmissionSchema.statics.hasSolved = async function(userId, challengeId) {
  const submission = await this.findOne({
    user: userId,
    challenge: challengeId,
    correct: true
  });
  
  return !!submission;
};

// Static method to get a team's solved challenges
SubmissionSchema.statics.getTeamSolves = async function(teamId) {
  return await this.find({
    team: teamId,
    correct: true
  })
  .populate('challenge', 'title category difficulty points')
  .sort({ createdAt: -1 });
};

// Static method to get a user's solved challenges
SubmissionSchema.statics.getUserSolves = async function(userId) {
  return await this.find({
    user: userId,
    correct: true
  })
  .populate('challenge', 'title category difficulty points')
  .sort({ createdAt: -1 });
};

const Submission = mongoose.model('Submission', SubmissionSchema);

module.exports = Submission;

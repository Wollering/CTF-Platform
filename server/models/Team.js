const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  // Enable virtual properties
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for team members
TeamSchema.virtual('members', {
  ref: 'User',
  localField: '_id',
  foreignField: 'team'
});

// Virtual for solved challenges (via Submission model)
TeamSchema.virtual('solvedChallenges', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'team',
  count: true,
  match: { correct: true }
});

// Method to calculate team points
TeamSchema.methods.calculatePoints = async function() {
  const submissions = await mongoose.model('Submission').find({
    team: this._id,
    correct: true
  }).populate('challenge', 'points');
  
  return submissions.reduce((total, submission) => {
    return total + (submission.challenge ? submission.challenge.points : 0);
  }, 0);
};

const Team = mongoose.model('Team', TeamSchema);

module.exports = Team;

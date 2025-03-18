const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10
  },
  category: {
    type: String,
    required: true,
    enum: ['web', 'crypto', 'forensics', 'pwn', 'reverse', 'misc'],
    lowercase: true
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard', 'expert'],
    lowercase: true
  },
  points: {
    type: Number,
    required: true,
    min: 10
  },
  flag: {
    type: String,
    required: true,
    trim: true
  },
  hint: {
    type: String,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  files: [{
    name: String,
    url: String,
    size: String
  }],
  visible: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Enable virtual properties
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Update the updatedAt timestamp on save
ChallengeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for number of times the challenge has been solved
ChallengeSchema.virtual('solvedCount', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'challenge',
  count: true,
  match: { correct: true }
});

// Method to check if a flag is correct
ChallengeSchema.methods.checkFlag = function(submittedFlag) {
  // Case-sensitive comparison
  return this.flag === submittedFlag;
};

// Static method to get challenges with solve counts
ChallengeSchema.statics.getChallengesWithSolveCounts = async function() {
  return await this.aggregate([
    {
      $lookup: {
        from: 'submissions',
        localField: '_id',
        foreignField: 'challenge',
        as: 'submissions'
      }
    },
    {
      $addFields: {
        solvedCount: {
          $size: {
            $filter: {
              input: '$submissions',
              as: 'submission',
              cond: { $eq: ['$$submission.correct', true] }
            }
          }
        }
      }
    },
    {
      $project: {
        submissions: 0
      }
    }
  ]);
};

const Challenge = mongoose.model('Challenge', ChallengeSchema);

module.exports = Challenge;

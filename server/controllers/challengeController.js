const Challenge = require('../models/Challenge');
const Submission = require('../models/Submission');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Get all visible challenges with solved status for the authenticated user
exports.getChallenges = async (req, res) => {
  try {
    // Get all visible challenges
    const challenges = await Challenge.find({ visible: true });
    
    // Check which challenges the user has solved
    const userSolves = await Submission.find({
      user: req.user.id,
      correct: true
    }).select('challenge');
    
    // Create a set of solved challenge IDs for quick lookup
    const solvedChallengeIds = new Set(
      userSolves.map(submission => submission.challenge.toString())
    );
    
    // Map challenges with additional solved status
    const challengesWithStatus = challenges.map(challenge => {
      const challengeObj = challenge.toObject();
      challengeObj.solved = solvedChallengeIds.has(challenge._id.toString());
      return challengeObj;
    });
    
    res.status(200).json(challengesWithStatus);
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving challenges'
    });
  }
};

// Get a specific challenge
exports.getChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    if (!challenge.visible && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this challenge'
      });
    }
    
    // Check if user has solved this challenge
    const solved = await Submission.exists({
      user: req.user.id,
      challenge: challenge._id,
      correct: true
    });
    
    // Create a response object with solved status
    const responseChallenge = challenge.toObject();
    
    // Only send the flag to admins
    if (!req.user.isAdmin) {
      delete responseChallenge.flag;
    }
    
    responseChallenge.solved = !!solved;
    
    res.status(200).json(responseChallenge);
  } catch (error) {
    console.error('Get challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving challenge'
    });
  }
};

// Create a new challenge (admin only)
exports.createChallenge = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      difficulty,
      points,
      flag,
      hint,
      author
    } = req.body;
    
    const challenge = new Challenge({
      title,
      description,
      category,
      difficulty,
      points,
      flag,
      hint,
      author
    });
    
    await challenge.save();
    
    res.status(201).json(challenge);
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating challenge'
    });
  }
};

// Update a challenge (admin only)
exports.updateChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    const {
      title,
      description,
      category,
      difficulty,
      points,
      flag,
      hint,
      author,
      visible
    } = req.body;
    
    // Update fields if provided
    if (title) challenge.title = title;
    if (description) challenge.description = description;
    if (category) challenge.category = category;
    if (difficulty) challenge.difficulty = difficulty;
    if (points) challenge.points = points;
    if (flag) challenge.flag = flag;
    if (hint !== undefined) challenge.hint = hint;
    if (author) challenge.author = author;
    if (visible !== undefined) challenge.visible = visible;
    
    // Update timestamp
    challenge.updatedAt = Date.now();
    
    await challenge.save();
    
    res.status(200).json(challenge);
  } catch (error) {
    console.error('Update challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating challenge'
    });
  }
};

// Delete a challenge (admin only)
exports.deleteChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Delete associated files from S3 if they exist
    if (challenge.files && challenge.files.length > 0) {
      for (const file of challenge.files) {
        // Extract the key from the URL
        const fileKey = file.url.split('/').pop();
        
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: `challenge-files/${fileKey}`
          }));
        } catch (s3Error) {
          console.error('S3 delete error:', s3Error);
          // Continue with deletion even if S3 delete fails
        }
      }
    }
    
    // Delete all submissions related to this challenge
    await Submission.deleteMany({ challenge: challenge._id });
    
    // Delete the challenge
    await Challenge.deleteOne({ _id: challenge._id });
    
    res.status(200).json({
      success: true,
      message: 'Challenge deleted successfully'
    });
  } catch (error) {
    console.error('Delete challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting challenge'
    });
  }
};

// Upload a file for a challenge (admin only)
exports.uploadFile = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files were uploaded'
      });
    }
    
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    const file = req.files.file;
    const fileExtension = path.extname(file.name);
    const fileName = `${uuidv4()}${fileExtension}`;
    const fileKey = `challenge-files/${fileName}`;
    
    // Calculate human-readable file size
    const fileSize = formatFileSize(file.size);
    
    // Upload file to S3
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey,
      Body: file.data,
      ContentType: file.mimetype
    };
    
    const uploadCommand = new PutObjectCommand(uploadParams);
    await s3Client.send(uploadCommand);
    
    // Generate file URL
    const fileUrl = `${process.env.AWS_S3_URL}/${fileKey}`;
    
    // Add file to challenge
    challenge.files.push({
      name: file.name,
      url: fileUrl,
      size: fileSize
    });
    
    await challenge.save();
    
    res.status(200).json({
      success: true,
      file: {
        name: file.name,
        url: fileUrl,
        size: fileSize
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading file'
    });
  }
};

// Get all challenges (admin only)
exports.getAllChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find();
    res.status(200).json(challenges);
  } catch (error) {
    console.error('Get all challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving all challenges'
    });
  }
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  else return (bytes / 1073741824).toFixed(1) + ' GB';
};

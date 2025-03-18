const User = require('../models/User');
const Team = require('../models/Team');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, email, password, teamName } = req.body;

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Check if team exists, or create a new one
    let team;
    const existingTeam = await Team.findOne({ name: teamName });

    if (existingTeam) {
      team = existingTeam;
    } else {
      // Create a temporary user to reference as createdBy
      const tempUser = new User({
        username,
        email,
        password
      });
      
      // Save the user to get an _id
      await tempUser.save();
      
      // Create the team
      team = new Team({
        name: teamName,
        createdBy: tempUser._id
      });
      
      await team.save();
      
      // Update the user with the team id
      tempUser.team = team._id;
      await tempUser.save();
      
      // Generate JWT token
      const token = generateToken(tempUser);
      
      // Return the new user with token
      return res.status(201).json({
        success: true,
        user: {
          _id: tempUser._id,
          username: tempUser.username,
          email: tempUser.email,
          isAdmin: tempUser.isAdmin,
          team: {
            _id: team._id,
            name: team.name
          }
        },
        token
      });
    }
    
    // If team already exists, create and save the user
    const user = new User({
      username,
      email,
      password,
      team: team._id
    });
    
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Return user data
    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        team: {
          _id: team._id,
          name: team.name
        }
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user by username
    const user = await User.findOne({ username }).populate('team', 'name');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Return user data
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        team: user.team
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('team', 'name');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        team: user.team
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting user data'
    });
  }
};

// Logout user
exports.logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

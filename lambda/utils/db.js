const mongoose = require('mongoose');

// Cache database connection
let conn = null;

/**
 * Connect to the MongoDB database
 * @returns {Promise<Object>} Mongoose connection
 */
exports.connect = async () => {
  // Return cached connection if exists
  if (conn) {
    return conn;
  }

  try {
    // Connect to MongoDB
    conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // Timeout after 5s if can't connect
    });

    console.log('MongoDB connected');
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

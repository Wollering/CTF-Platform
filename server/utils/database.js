const mongoose = require('mongoose');

// Database connection cache
let cachedDb = null;

/**
 * Connect to MongoDB
 * @returns {Promise<Db>} MongoDB database instance
 */
const connectToDatabase = async () => {
  // If we already have a connection, use it
  if (cachedDb) {
    return cachedDb;
  }

  try {
    // Connect to MongoDB
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Cache the database connection
    cachedDb = connection.connection.db;
    
    console.log('MongoDB connected successfully');
    
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

module.exports = { connectToDatabase };

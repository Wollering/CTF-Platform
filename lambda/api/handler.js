const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { connectToDatabase } = require('../../server/utils/database');

// Import routes
const authRoutes = require('../../server/routes/auth');
const challengeRoutes = require('../../server/routes/challenges');
const submissionRoutes = require('../../server/routes/submissions');
const teamRoutes = require('../../server/routes/teams');

// Initialize express app
const app = express();

// Connect to database
let cachedDb = null;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/teams', teamRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: process.env.SERVICE_NAME || 'ctf-platform-api',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Lambda API Error:', err);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// Serverless handler
const handler = serverless(app);

// Export the handler function with database connection
module.exports.handler = async (event, context) => {
  // Preserve database connection between function calls
  context.callbackWaitsForEmptyEventLoop = false;
  
  // Connect to database if not already connected
  if (!cachedDb) {
    cachedDb = await connectToDatabase();
  }
  
  return await handler(event, context);
};

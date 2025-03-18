/**
 * Helper function to format Lambda API responses
 */

// Success response
exports.success = (data, statusCode = 200) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CLIENT_URL || '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      success: true,
      ...data
    })
  };
};

// Error response
exports.error = (message, statusCode = 500, errorDetails = null) => {
  const response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CLIENT_URL || '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      success: false,
      message
    })
  };

  // Only include error details in development
  if (errorDetails && process.env.NODE_ENV !== 'production') {
    response.body = JSON.stringify({
      success: false,
      message,
      error: errorDetails
    });
  }

  return response;
};

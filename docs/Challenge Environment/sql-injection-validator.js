// SQL Injection Challenge Validator
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Validates a user's solution submission for the SQL Injection challenge
 */
exports.handler = async (event) => {
  try {
    // Parse the incoming request
    const { userId, challengeId, environmentId, solution } = JSON.parse(event.body);
    
    console.log(`Processing solution submission for user ${userId}, challenge ${challengeId}, environment ${environmentId}`);
    
    // Retrieve challenge environment details from DynamoDB
    const environmentParams = {
      TableName: process.env.ENVIRONMENTS_TABLE,
      Key: { id: environmentId }
    };
    
    const environmentResult = await dynamoDB.get(environmentParams).promise();
    const environment = environmentResult.Item;
    
    // Check if environment exists and is active
    if (!environment) {
      return formatResponse(404, {
        success: false,
        message: "Challenge environment not found or has expired"
      });
    }
    
    if (environment.status !== 'active') {
      return formatResponse(400, {
        success: false,
        message: `Environment is in ${environment.status} state. Only active environments can be used.`
      });
    }
    
    // Check for empty solution
    if (!solution || solution.trim() === '') {
      return formatResponse(400, {
        success: false,
        message: "Please provide a solution to validate"
      });
    }
    
    // Get the expected flag for this environment
    const expectedFlag = `CTF{sql_1nj3ct10n_m4st3r_${environmentId}}`;
    
    // Compare the submitted solution with the expected flag (case-sensitive)
    const isCorrect = solution.trim() === expectedFlag;
    
    // If correct, update user progress and award points
    if (isCorrect) {
      // Determine points to award (base points minus any deductions for hints)
      const basePoints = 100;
      const hintDeductions = await calculateHintDeductions(userId, challengeId);
      const pointsAwarded = Math.max(basePoints - hintDeductions, 10); // Minimum 10 points
      
      // Record the successful completion
      await recordCompletion(userId, challengeId, environmentId, pointsAwarded);
      
      return formatResponse(200, {
        success: true,
        message: "Congratulations! You've successfully exploited the SQL injection vulnerability and found the flag.",
        points: pointsAwarded
      });
    }
    
    // For incorrect submissions
    return formatResponse(200, {
      success: false,
      message: "Incorrect flag. Keep trying! Make sure you've gained admin access to see the secret content."
    });
    
  } catch (error) {
    console.error("Error processing solution:", error);
    return formatResponse(500, {
      success: false,
      message: "An error occurred while validating your solution. Please try again."
    });
  }
};

/**
 * Helper function to format the API response
 */
const formatResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // For CORS support
      "Access-Control-Allow-Credentials": true
    },
    body: JSON.stringify(body)
  };
};

/**
 * Calculate point deductions based on hints used
 */
const calculateHintDeductions = async (userId, challengeId) => {
  try {
    // Query for hints used by this user for this challenge
    const hintsParams = {
      TableName: process.env.HINTS_USAGE_TABLE,
      IndexName: "UserChallengeIndex",
      KeyConditionExpression: "userId = :userId AND challengeId = :challengeId",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":challengeId": challengeId
      }
    };
    
    const hintsResult = await dynamoDB.query(hintsParams).promise();
    
    // Sum the cost of all hints used
    return hintsResult.Items.reduce((total, hint) => total + hint.cost, 0);
  } catch (error) {
    console.error("Error calculating hint deductions:", error);
    return 0; // Default to no deductions if there's an error
  }
};

/**
 * Record successful challenge completion
 */
const recordCompletion = async (userId, challengeId, environmentId, points) => {
  const timestamp = new Date().toISOString();
  
  // Create completion record
  const completionParams = {
    TableName: process.env.COMPLETIONS_TABLE,
    Item: {
      id: `${userId}#${challengeId}`,
      userId,
      challengeId,
      environmentId,
      completedAt: timestamp,
      pointsAwarded: points
    }
  };
  
  // Update user's total points and completed challenges
  const userUpdateParams = {
    TableName: process.env.USERS_TABLE,
    Key: { id: userId },
    UpdateExpression: "ADD points :points, completedChallenges :challenge",
    ExpressionAttributeValues: {
      ":points": points,
      ":challenge": dynamoDB.createSet([challengeId])
    },
    ReturnValues: "NONE"
  };
  
  // Use a transaction to ensure both updates occur
  const transactionParams = {
    TransactItems: [
      { Put: completionParams },
      { Update: userUpdateParams }
    ]
  };
  
  await dynamoDB.transactWrite(transactionParams).promise();
  
  // Record this completion in challenge stats
  await updateChallengeStats(challengeId);
};

/**
 * Update challenge statistics
 */
const updateChallengeStats = async (challengeId) => {
  const statsParams = {
    TableName: process.env.CHALLENGES_TABLE,
    Key: { id: challengeId },
    UpdateExpression: "ADD completions :val",
    ExpressionAttributeValues: {
      ":val": 1
    }
  };
  
  await dynamoDB.update(statsParams).promise();
};

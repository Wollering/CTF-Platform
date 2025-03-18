// This file contains key implementation examples for the CTF platform using MERN stack and AWS serverless technologies

// ==========================================
// BACKEND IMPLEMENTATION (NODE.JS + EXPRESS)
// ==========================================

// server.js - Main Express application setup
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1'
});

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('combined')); // Logging

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

// Admin routes with additional authentication middleware
app.use('/api/admin', require('./middleware/adminAuth'), require('./routes/admin'));

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    requestId: req.requestId
  });
});

// Start server (for local development)
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  const server = createServer(app);
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// For Lambda deployment
module.exports.handler = require('serverless-express/handler')(app);

// ==========================================
// LAMBDA FUNCTIONS FOR CHALLENGE ENVIRONMENT
// ==========================================

// environmentProvisioner.js - Lambda function to create isolated challenge environments
const AWS = require('aws-sdk');
const cloudformation = new AWS.CloudFormation();
const dynamodb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event, context) => {
  try {
    const { userId, teamId, challengeId } = JSON.parse(event.body);
    
    // Get challenge template from DynamoDB
    const challengeResult = await dynamodb.get({
      TableName: process.env.CHALLENGES_TABLE,
      Key: { challengeId }
    }).promise();
    
    const challenge = challengeResult.Item;
    if (!challenge) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Challenge not found' })
      };
    }
    
    // Create unique stack name
    const stackName = `ctf-challenge-${challengeId}-${userId.substring(0, 8)}-${Date.now()}`;
    
    // Create CloudFormation stack using the challenge template
    const stackResult = await cloudformation.createStack({
      StackName: stackName,
      TemplateURL: challenge.templateUrl,
      Parameters: [
        {
          ParameterKey: 'ChallengeId',
          ParameterValue: challengeId
        },
        {
          ParameterKey: 'UserId',
          ParameterValue: userId
        },
        {
          ParameterKey: 'TeamId',
          ParameterValue: teamId || ''
        }
      ],
      Capabilities: ['CAPABILITY_IAM'],
      OnFailure: 'DELETE',
      Tags: [
        {
          Key: 'Purpose',
          Value: 'CTF Challenge'
        },
        {
          Key: 'UserId',
          Value: userId
        },
        {
          Key: 'ChallengeId',
          Value: challengeId
        }
      ]
    }).promise();
    
    // Create environment record in DynamoDB
    const environmentId = `env-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    await dynamodb.put({
      TableName: process.env.ENVIRONMENTS_TABLE,
      Item: {
        environmentId,
        userId,
        teamId: teamId || null,
        challengeId,
        stackId: stackResult.StackId,
        status: 'provisioning',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (3600000 * 4)).toISOString(), // 4 hour expiration
        resources: []
      }
    }).promise();
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        environmentId,
        stackId: stackResult.StackId,
        status: 'provisioning'
      })
    };
  } catch (error) {
    console.error('Error provisioning environment:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to provision environment' })
    };
  }
};

// environmentMonitor.js - Lambda function to check environment status
const AWS = require('aws-sdk');
const cloudformation = new AWS.CloudFormation();
const dynamodb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    // Get all provisioning environments
    const result = await dynamodb.scan({
      TableName: process.env.ENVIRONMENTS_TABLE,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'provisioning'
      }
    }).promise();
    
    const environments = result.Items;
    
    // Process each environment
    const updatePromises = environments.map(async (env) => {
      try {
        // Check CloudFormation stack status
        const stackResult = await cloudformation.describeStacks({
          StackName: env.stackId
        }).promise();
        
        const stack = stackResult.Stacks[0];
        
        if (stack.StackStatus === 'CREATE_COMPLETE') {
          // Extract outputs from stack
          const outputs = {};
          stack.Outputs.forEach(output => {
            outputs[output.OutputKey] = output.OutputValue;
          });
          
          // Update environment in DynamoDB
          await dynamodb.update({
            TableName: process.env.ENVIRONMENTS_TABLE,
            Key: { environmentId: env.environmentId },
            UpdateExpression: 'SET #status = :status, accessUrl = :accessUrl, resources = :resources',
            ExpressionAttributeNames: {
              '#status': 'status'
            },
            ExpressionAttributeValues: {
              ':status': 'active',
              ':accessUrl': outputs.EnvironmentAccessUrl || '',
              ':resources': stack.Outputs.map(o => ({
                key: o.OutputKey,
                value: o.OutputValue,
                description: o.Description
              }))
            }
          }).promise();
        } else if (stack.StackStatus.includes('FAILED') || stack.StackStatus.includes('ROLLBACK')) {
          // Update environment as failed
          await dynamodb.update({
            TableName: process.env.ENVIRONMENTS_TABLE,
            Key: { environmentId: env.environmentId },
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: {
              '#status': 'status'
            },
            ExpressionAttributeValues: {
              ':status': 'failed'
            }
          }).promise();
        }
      } catch (error) {
        console.error(`Error processing environment ${env.environmentId}:`, error);
      }
    });
    
    await Promise.all(updatePromises);
    
    return { success: true };
  } catch (error) {
    console.error('Error monitoring environments:', error);
    return { success: false, error: error.message };
  }
};

// challengeValidator.js - Lambda function to validate challenge submissions
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

module.exports.handler = async (event) => {
  try {
    const { userId, teamId, challengeId, environmentId, submission } = JSON.parse(event.body);
    
    // Get challenge details
    const challengeResult = await dynamodb.get({
      TableName: process.env.CHALLENGES_TABLE,
      Key: { challengeId }
    }).promise();
    
    const challenge = challengeResult.Item;
    if (!challenge) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Challenge not found' })
      };
    }
    
    // Get environment details
    const envResult = await dynamodb.get({
      TableName: process.env.ENVIRONMENTS_TABLE,
      Key: { environmentId }
    }).promise();
    
    const environment = envResult.Item;
    if (!environment) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Environment not found' })
      };
    }
    
    // Verify ownership
    if (environment.userId !== userId || environment.teamId !== teamId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Access denied to this environment' })
      };
    }
    
    // Invoke the challenge-specific validator
    const validationResult = await lambda.invoke({
      FunctionName: challenge.validationStrategy,
      Payload: JSON.stringify({
        submission,
        environmentId,
        challengeId,
        userId,
        teamId
      })
    }).promise();
    
    const validation = JSON.parse(validationResult.Payload);
    
    // Record the submission
    const submissionId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();
    
    await dynamodb.put({
      TableName: process.env.SUBMISSIONS_TABLE,
      Item: {
        submissionId,
        challengeId,
        userId,
        teamId: teamId || null,
        timestamp,
        status: validation.success ? 'correct' : 'incorrect',
        attempt: submission,
        points: validation.success ? challenge.points : 0,
        timeTaken: (new Date(timestamp).getTime() - new Date(environment.createdAt).getTime()) / 1000,
        hintsUsed: 0, // This would be tracked separately
        environmentId
      }
    }).promise();
    
    // If successful, update user/team score
    if (validation.success) {
      // Update user score
      await dynamodb.update({
        TableName: process.env.USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'ADD points :points SET completedChallenges = list_append(if_not_exists(completedChallenges, :empty_list), :challenge)',
        ExpressionAttributeValues: {
          ':points': challenge.points,
          ':challenge': [challengeId],
          ':empty_list': []
        }
      }).promise();
      
      // Update team score if applicable
      if (teamId) {
        await dynamodb.update({
          TableName: process.env.TEAMS_TABLE,
          Key: { teamId },
          UpdateExpression: 'ADD points :points SET completedChallenges = list_append(if_not_exists(completedChallenges, :empty_list), :challenge)',
          ExpressionAttributeValues: {
            ':points': challenge.points,
            ':challenge': [challengeId],
            ':empty_list': []
          }
        }).promise();
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: validation.success,
        message: validation.message,
        points: validation.success ? challenge.points : 0,
        submissionId
      })
    };
  } catch (error) {
    console.error('Error validating challenge:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to validate challenge submission' })
    };
  }
};

// ==========================================
// FRONTEND REACT COMPONENTS
// ==========================================

// src/components/ChallengeCard.jsx - Component to display a challenge in the catalog
import React from 'react';
import { Card, Badge, Button, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { startChallenge } from '../redux/actions/challengeActions';

const ChallengeCard = ({ challenge }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const handleStartChallenge = () => {
    dispatch(startChallenge(challenge.challengeId))
      .then(result => {
        if (result.success) {
          navigate(`/challenge/${challenge.challengeId}/environment/${result.environmentId}`);
        }
      });
  };
  
  // Determine difficulty color
  const getDifficultyColor = (level) => {
    switch(level) {
      case 1: return 'success';
      case 2: return 'info';
      case 3: return 'primary';
      case 4: return 'warning';
      case 5: return 'danger';
      default: return 'secondary';
    }
  };
  
  return (
    <Card className="challenge-card mb-4 shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{challenge.title}</h5>
        <Badge bg={getDifficultyColor(challenge.difficulty)}>
          {challenge.difficulty}/5
        </Badge>
      </Card.Header>
      <Card.Body>
        <Card.Text>{challenge.description}</Card.Text>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Badge bg="secondary">{challenge.category}</Badge>
          <span>{challenge.points} points</span>
        </div>
        <div className="mb-3">
          <small className="text-muted">Success Rate</small>
          <ProgressBar now={challenge.successRate} label={`${challenge.successRate}%`} variant="info" />
        </div>
      </Card.Body>
      <Card.Footer className="bg-white border-top-0">
        <Button variant="primary" block onClick={handleStartChallenge}>
          Start Challenge
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default ChallengeCard;

// src/components/ChallengeEnvironment.jsx - Component for active challenge workspace
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Container, Row, Col, Card, Button, Alert, Spinner, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faLightbulb, faFlag } from '@fortawesome/free-solid-svg-icons';
import { getEnvironment, submitSolution, useHint } from '../redux/actions/challengeActions';
import Terminal from './Terminal';
import Timer from './Timer';

const ChallengeEnvironment = () => {
  const { challengeId, environmentId } = useParams();
  const dispatch = useDispatch();
  const [solution, setSolution] = useState('');
  const [countdown, setCountdown] = useState(null);
  
  const { environment, challenge, loading, error, hints } = useSelector(state => state.challenges);
  
  useEffect(() => {
    dispatch(getEnvironment(challengeId, environmentId));
    
    // Setup countdown timer based on environment expiration
    if (environment && environment.expiresAt) {
      const expiration = new Date(environment.expiresAt).getTime();
      const now = new Date().getTime();
      setCountdown(Math.max(0, Math.floor((expiration - now) / 1000)));
    }
  }, [dispatch, challengeId, environmentId, environment?.expiresAt]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(submitSolution(challengeId, environmentId, solution));
  };
  
  const handleUseHint = (hintId) => {
    dispatch(useHint(challengeId, hintId));
  };
  
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ml-2">Loading environment...</span>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container>
        <Alert variant="danger">
          Error: {error}
        </Alert>
      </Container>
    );
  }
  
  if (!environment || !challenge) {
    return (
      <Container>
        <Alert variant="warning">
          Environment not found or no longer available.
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container fluid className="py-4">
      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h4>{challenge.title}</h4>
              <div>
                <FontAwesomeIcon icon={faClock} className="mr-2" />
                <Timer seconds={countdown} onExpire={() => alert('Environment is about to expire!')} />
              </div>
            </Card.Header>
            <Card.Body>
              <div className="challenge-description mb-4">
                {challenge.description}
              </div>
              
              {environment.status === 'active' && (
                <div className="environment-access mb-4">
                  <h5>Access Your Environment</h5>
                  
                  {environment.resources.map((resource, index) => (
                    <div key={index} className="resource-item mb-2">
                      <strong>{resource.key}:</strong> 
                      {resource.key.toLowerCase().includes('url') ? (
                        <a href={resource.value} target="_blank" rel="noopener noreferrer" className="ml-2">
                          {resource.value}
                        </a>
                      ) : (
                        <span className="ml-2">{resource.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {environment.status === 'provisioning' && (
                <Alert variant="info">
                  <Spinner animation="border" size="sm" className="mr-2" />
                  Your environment is being provisioned. This may take a few minutes...
                </Alert>
              )}
              
              <Terminal />
              
              <Form onSubmit={handleSubmit} className="mt-4">
                <Form.Group>
                  <Form.Label><strong>Submit your solution (flag)</strong></Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter the flag (e.g., CTF{secret_value})" 
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    required
                  />
                </Form.Group>
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="mt-2"
                  disabled={environment.status !== 'active'}
                >
                  <FontAwesomeIcon icon={faFlag} className="mr-2" />
                  Submit Flag
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="mb-4">
            <Card.Header>
              <h5>Hints</h5>
            </Card.Header>
            <Card.Body>
              {hints.length > 0 ? (
                hints.map((hint, index) => (
                  <div key={index} className="hint-item mb-3">
                    {hint.unlocked ? (
                      <>
                        <div className="d-flex justify-content-between">
                          <strong>Hint {index + 1}</strong>
                          <span className="text-muted">{hint.cost} points</span>
                        </div>
                        <p>{hint.content}</p>
                      </>
                    ) : (
                      <div className="d-flex justify-content-between align-items-center">
                        <span>Hint {index + 1} (costs {hint.cost} points)</span>
                        <Button 
                          variant="outline-info" 
                          size="sm"
                          onClick={() => handleUseHint(hint.id)}
                        >
                          <FontAwesomeIcon icon={faLightbulb} className="mr-1" />
                          Unlock
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted">No hints available for this challenge.</p>
              )}
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Header>
              <h5>Challenge Information</h5>
            </Card.Header>
            <Card.Body>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <strong>Category:</strong> <span>{challenge.category}</span>
                </li>
                <li className="mb-2">
                  <strong>Difficulty:</strong> <span>{challenge.difficulty}/5</span>
                </li>
                <li className="mb-2">
                  <strong>Points:</strong> <span>{challenge.points}</span>
                </li>
                <li className="mb-2">
                  <strong>Author:</strong> <span>{challenge.author}</span>
                </li>
                <li className="mb-2">
                  <strong>Success Rate:</strong> <span>{challenge.successRate}%</span>
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ChallengeEnvironment;

// src/redux/reducers/challengeReducer.js - Redux state management for challenges
import {
  FETCH_CHALLENGES_REQUEST,
  FETCH_CHALLENGES_SUCCESS,
  FETCH_CHALLENGES_FAILURE,
  START_CHALLENGE_REQUEST,
  START_CHALLENGE_SUCCESS,
  START_CHALLENGE_FAILURE,
  GET_ENVIRONMENT_REQUEST,
  GET_ENVIRONMENT_SUCCESS,
  GET_ENVIRONMENT_FAILURE,
  SUBMIT_SOLUTION_REQUEST,
  SUBMIT_SOLUTION_SUCCESS,
  SUBMIT_SOLUTION_FAILURE,
  USE_HINT_REQUEST,
  USE_HINT_SUCCESS,
  USE_HINT_FAILURE
} from '../actions/types';

const initialState = {
  challenges: [],
  challenge: null,
  environment: null,
  hints: [],
  loading: false,
  error: null,
  submission: {
    loading: false,
    success: null,
    message: '',
    error: null
  }
};

export default function challengeReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_CHALLENGES_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
    case FETCH_CHALLENGES_SUCCESS:
      return {
        ...state,
        loading: false,
        challenges: action.payload,
        error: null
      };
    case FETCH_CHALLENGES_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case START_CHALLENGE_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
    case START_CHALLENGE_SUCCESS:
      return {
        ...state,
        loading: false,
        environment: action.payload,
        error: null
      };
    case START_CHALLENGE_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case GET_ENVIRONMENT_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
    case GET_ENVIRONMENT_SUCCESS:
      return {
        ...state,
        loading: false,
        challenge: action.payload.challenge,
        environment: action.payload.environment,
        hints: action.payload.hints.map(hint => ({
          ...hint,
          unlocked: hint.unlocked || false
        })),
        error: null
      };
    case GET_ENVIRONMENT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case SUBMIT_SOLUTION_REQUEST:
      return {
        ...state,
        submission: {
          ...state.submission,
          loading: true,
          error: null
        }
      };
    case SUBMIT_SOLUTION_SUCCESS:
      return {
        ...state,
        submission: {
          loading: false,
          success: action.payload.success,
          message: action.payload.message,
          error: null
        }
      };
    case SUBMIT_SOLUTION_FAILURE:
      return {
        ...state,
        submission: {
          ...state.submission,
          loading: false,
          error: action.payload
        }
      };
    case USE_HINT_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
    case USE_HINT_SUCCESS:
      return {
        ...state,
        loading: false,
        hints: state.hints.map(hint => 
          hint.id === action.payload.hintId 
            ? { ...hint, unlocked: true } 
            : hint
        ),
        error: null
      };
    case USE_HINT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    default:
      return state;
  }
}

// ==========================================
// AWS INFRASTRUCTURE (SERVERLESS.YML)
// ==========================================

// serverless.yml - Serverless Framework configuration for AWS deployment
service: ctf-platform

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs16.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  memorySize: 256
  timeout: 30
  
  environment:
    USERS_TABLE: ${self:service}-users-${self:provider.stage}
    TEAMS_TABLE: ${self:service}-teams-${self:provider.stage}
    CHALLENGES_TABLE: ${self:service}-challenges-${self:provider.stage}
    SUBMISSIONS_TABLE: ${self:service}-submissions-${self:provider.stage}
    ENVIRONMENTS_TABLE: ${self:service}-environments-${self:provider.stage}
    JWT_SECRET: ${ssm:/ctf-platform/${self:provider.stage}/jwt-secret~true}
    CORS_ORIGIN: ${ssm:/ctf-platform/${self:provider.stage}/cors-origin}
  
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
            - dynamodb:BatchGetItem
            - dynamodb:BatchWriteItem
          Resource: 
            - !GetAtt UsersTable.Arn
            - !GetAtt TeamsTable.Arn
            - !GetAtt ChallengesTable.Arn
            - !GetAtt SubmissionsTable.Arn
            - !GetAtt EnvironmentsTable.Arn
        - Effect: Allow
          Action:
            - cloudformation:CreateStack
            - cloudformation:DescribeStacks
            - cloudformation:DeleteStack
            - cloudformation:UpdateStack
            - cloudformation:ListStackResources
          Resource: "arn:aws:cloudformation:${self:provider.region}:*:stack/ctf-challenge-*/*"
        - Effect: Allow
          Action:
            - lambda:InvokeFunction
          Resource: "*"

functions:
  api:
    handler: server.handler
    events:
      - httpApi:
          path: /api/{proxy+}
          method: any
  
  environmentProvisioner:
    handler: handlers/environmentProvisioner.handler
    events:
      - httpApi:
          path: /api/environments
          method: post
          authorizer:
            name: jwtAuthorizer
  
  environmentMonitor:
    handler: handlers/environmentMonitor.handler
    events:
      - schedule: rate(1 minute)
  
  environmentCleaner:
    handler: handlers/environmentCleaner.handler
    events:
      - schedule: rate(5 minutes)
  
  challengeValidator:
    handler: handlers/challengeValidator.handler
    events:
      - httpApi:
          path: /api/challenges/{challengeId}/validate
          method: post
          authorizer:
            name: jwtAuthorizer

resources:
  Resources:
    # DynamoDB Tables
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.USERS_TABLE}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: userId
            AttributeType: S
          - AttributeName: email
            AttributeType: S
        KeySchema:
          - AttributeName: userId
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: EmailIndex
            KeySchema:
              - AttributeName: email
                KeyType: HASH
            Projection:
              ProjectionType: ALL
    
    TeamsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.TEAMS_TABLE}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: teamId
            AttributeType: S
          - AttributeName: teamName
            AttributeType: S
        KeySchema:
          - AttributeName: teamId
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: TeamNameIndex
            KeySchema:
              - AttributeName: teamName
                KeyType: HASH
            Projection:
              ProjectionType: ALL
    
    ChallengesTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.CHALLENGES_TABLE}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: challengeId
            AttributeType: S
          - AttributeName: category
            AttributeType: S
        KeySchema:
          - AttributeName: challengeId
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: CategoryIndex
            KeySchema:
              - AttributeName: category
                KeyType: HASH
            Projection:
              ProjectionType: ALL
    
    SubmissionsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.SUBMISSIONS_TABLE}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: submissionId
            AttributeType: S
          - AttributeName: userId
            AttributeType: S
          - AttributeName: timestamp
            AttributeType: S
          - AttributeName: challengeId
            AttributeType: S
        KeySchema:
          - AttributeName: submissionId
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: UserSubmissionsIndex
            KeySchema:
              - AttributeName: userId
                KeyType: HASH
              - AttributeName: timestamp
                KeyType: RANGE
            Projection:
              ProjectionType: ALL
          - IndexName: ChallengeSubmissionsIndex
            KeySchema:
              - AttributeName: challengeId
                KeyType: HASH
              - AttributeName: timestamp
                KeyType: RANGE
            Projection:
              ProjectionType: ALL
    
    EnvironmentsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.ENVIRONMENTS_TABLE}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: environmentId
            AttributeType: S
          - AttributeName: userId
            AttributeType: S
          - AttributeName: challengeId
            AttributeType: S
        KeySchema:
          - AttributeName: environmentId
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: UserEnvironmentsIndex
            KeySchema:
              - AttributeName: userId
                KeyType: HASH
            Projection:
              ProjectionType: ALL
          - IndexName: ChallengeEnvironmentsIndex
            KeySchema:
              - AttributeName: challengeId
                KeyType: HASH
            Projection:
              ProjectionType: ALL
        TimeToLiveSpecification:
          AttributeName: ttl
          Enabled: true
    
    # S3 Bucket for frontend and challenge assets
    AssetsBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: ${self:service}-assets-${self:provider.stage}
        AccessControl: Private
        CorsConfiguration:
          CorsRules:
            - AllowedHeaders:
                - '*'
              AllowedMethods:
                - GET
              AllowedOrigins:
                - ${ssm:/ctf-platform/${self:provider.stage}/cors-origin}
              MaxAge: 3000
    
    # CloudFront distribution for frontend
    CloudFrontDistribution:
      Type: AWS::CloudFront::Distribution
      Properties:
        DistributionConfig:
          Origins:
            - DomainName: ${self:service}-assets-${self:provider.stage}.s3.amazonaws.com
              Id: S3Origin
              S3OriginConfig:
                OriginAccessIdentity: !Sub "origin-access-identity/cloudfront/${CloudFrontOriginAccessIdentity}"
          Enabled: true
          DefaultRootObject: index.html
          DefaultCacheBehavior:
            TargetOriginId: S3Origin
            ViewerProtocolPolicy: redirect-to-https
            ForwardedValues:
              QueryString: false
              Cookies:
                Forward: none
          ViewerCertificate:
            CloudFrontDefaultCertificate: true
    
    CloudFrontOriginAccessIdentity:
      Type: AWS::CloudFront::CloudFrontOriginAccessIdentity
      Properties:
        CloudFrontOriginAccessIdentityConfig:
          Comment: "OAI for ${self:service}-${self:provider.stage}"

    # Cognito User Pool for authentication
    UserPool:
      Type: AWS::Cognito::UserPool
      Properties:
        UserPoolName: ${self:service}-user-pool-${self:provider.stage}
        UsernameAttributes:
          - email
        AutoVerifiedAttributes:
          - email
        Policies:
          PasswordPolicy:
            MinimumLength: 8
            RequireLowercase: true
            RequireNumbers: true
            RequireSymbols: false
            RequireUppercase: true
    
    UserPoolClient:
      Type: AWS::Cognito::UserPoolClient
      Properties:
        ClientName: ${self:service}-app-client-${self:provider.stage}
        UserPoolId: !Ref UserPool
        ExplicitAuthFlows:
          - ALLOW_USER_SRP_AUTH
          - ALLOW_REFRESH_TOKEN_AUTH
        GenerateSecret: false

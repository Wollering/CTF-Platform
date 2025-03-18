# CTF Platform

A comprehensive Capture The Flag (CTF) platform inspired by AWS Jam, built on the MERN stack (MongoDB/DynamoDB, Express, React, Node.js) and AWS serverless technologies. This platform enables cybersecurity education and competition through isolated, dynamic challenge environments.

## Overview

The CTF Platform provides a complete solution for creating, hosting, and participating in cybersecurity challenges. With its serverless architecture and automated environment provisioning, users can instantly access realistic environments to practice and test their skills across various cybersecurity domains.

![CTF Platform Interface](./docs/images/platform-screenshot.png)

### Key Features

- **Isolated Challenge Environments**: Dynamically provisions AWS resources for each user/team
- **Real-time Terminal Access**: Browser-based terminal for direct interaction with environments
- **Progress Tracking**: Track user/team progress, points, and completion status
- **Resource Management**: Easy access to all provisioned AWS resources
- **Comprehensive Guide System**: Built-in educational content for each challenge
- **Team Collaboration**: Support for both individual and team participation
- **Interactive Hints**: Progressive hint system with optional point penalties
- **Administrative Dashboard**: Challenge creation and management interface

## Architecture

The platform is built on a modern, serverless architecture:

### Frontend
- React.js single-page application
- Redux for state management
- React Router for navigation
- React Bootstrap for UI components
- WebSockets for real-time terminal communication

### Backend
- Node.js with Express.js
- Serverless deployment with AWS Lambda
- API Gateway for RESTful endpoints
- WebSocket API for terminal connectivity
- JWT for authentication

### Database
- DynamoDB for main data storage
- Tables for users, teams, challenges, environments, and submissions

### AWS Services
- CloudFormation for environment provisioning
- Lambda for serverless computing
- API Gateway for API management
- S3 for static assets and challenge files
- Cognito for user authentication
- CloudFront for content delivery
- IAM for secure access control
- Systems Manager for secure parameter storage

## Getting Started

### Prerequisites

- AWS Account with appropriate permissions
- Node.js (v16+) and npm
- AWS CLI configured with admin credentials
- Serverless Framework (`npm install -g serverless`)
- MongoDB Atlas account (optional, if using MongoDB instead of DynamoDB)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/ctf-platform.git
cd ctf-platform
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:
```bash
# Create .env file in backend directory
cp backend/.env.example backend/.env

# Create .env file in frontend directory
cp frontend/.env.example frontend/.env
```

4. Update configuration:
   - Edit `backend/.env` with your AWS region, DynamoDB table names, and JWT secret
   - Edit `frontend/.env` with your API endpoint and Cognito settings

### Local Development

1. Start the backend development server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080

## Deployment

### Backend Deployment

1. Set up AWS infrastructure:
```bash
cd terraform
terraform init
terraform apply
```

2. Deploy the backend services:
```bash
cd backend
serverless deploy --stage prod
```

### Frontend Deployment

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Deploy to S3 and invalidate CloudFront:
```bash
aws s3 sync build/ s3://your-bucket-name
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Creating Challenges

### Challenge Structure

Each challenge consists of:

1. **Metadata**: Title, description, category, difficulty, points
2. **CloudFormation Template**: Defines the AWS resources for the challenge
3. **Validation Logic**: Lambda function to verify solutions
4. **Guide Content**: Educational material explaining concepts
5. **Hints**: Progressive clues to assist participants

### Adding a New Challenge

1. Create a CloudFormation template in the `challenges/templates` directory
2. Implement validation logic in the `backend/validators` directory
3. Add challenge metadata through the admin interface or directly to the database
4. Create guide content using Markdown in the `challenges/guides` directory

Example challenge metadata:
```json
{
  "challengeId": "sql-injection-basics",
  "title": "SQL Injection Basics",
  "description": "Learn and exploit basic SQL injection vulnerabilities in a web application.",
  "category": "Web Security",
  "difficulty": 2,
  "points": 100,
  "templateUrl": "s3://ctf-platform-challenges/templates/sql-injection-basics.yml",
  "validationStrategy": "sqlInjectionValidator",
  "timeLimit": 4,
  "author": "securityTeam"
}
```

## Administration

### User Management

Administrators can:
- Create, update, and delete user accounts
- Assign roles (admin, user)
- Reset passwords
- View user activity and progress

### Challenge Management

Administrators can:
- Create, update, and delete challenges
- Monitor challenge environments
- View submission statistics
- Adjust point values and difficulty

### Resource Monitoring

The platform includes:
- Environment usage metrics
- Cost tracking
- Resource utilization
- Automatic cleanup of expired environments

## Contributing

We welcome contributions to improve the CTF Platform! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow the existing code style and naming conventions
- Write unit tests for new features
- Document your code with JSDoc comments
- Update README and documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- AWS Jam platform for inspiration
- The open-source community for various libraries and tools
- Contributors who have helped improve the platform

## Support

For support, please open an issue in the GitHub repository or contact the maintainers at support@ctfplatform.com.

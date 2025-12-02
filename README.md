# Transaction Management API

A NestJS-based RESTful API for managing real estate transactions with MongoDB. The application handles transaction lifecycle management, financial breakdown calculations, and stage transitions with comprehensive type-safe testing.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running the Project](#running-the-project)
- [Running Tests](#running-tests)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

## Features

- **Transaction Management**: Create, retrieve, and manage real estate transactions
- **Stage Lifecycle**: Track transactions through multiple stages (Agreement → Earnest Money → Title Deed → Completed)
- **Financial Calculations**: Automatic commission breakdown calculation based on agents
- **Stage History**: Track all changes and stage transitions with timestamps
- **Type-Safe Testing**: Comprehensive unit and integration tests with full TypeScript support
- **MongoDB Integration**: Persistent data storage with Mongoose ODM
- **Input Validation**: Class-validator for robust DTO validation

## Prerequisites

- **Node.js**: v18 or higher
- **npm**: v8 or higher
- **MongoDB Atlas Account**: For cloud database hosting
- **Git**: For version control

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/silrith/berkozerdogan-task.git
cd berkozerdogan-task
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- `@nestjs/*` - NestJS framework and modules
- `mongoose` - MongoDB ODM
- `class-validator` - DTO validation
- Development dependencies: Jest, TypeScript, ESLint, Prettier

## Environment Configuration

### MongoDB Atlas Setup

1. **Create MongoDB Atlas Account** (if you don't have one):
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account
   - Create a new project

2. **Create a Cluster**:
   - Click "Create a Deployment"
   - Choose "M0 Free" tier (free for development)
   - Select your preferred region
   - Wait for cluster creation (5-10 minutes)

3. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Drivers" → "Node.js"
   - Copy the connection string (example format):
     ```
     mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>?retryWrites=true&w=majority&appName=<appName>
     ```

4. **Configure Environment Variables**:
   - Create a `.env` file in the project root (reference `.env.example`):

```bash
# .env
PORT=2122

# MongoDB Atlas Configuration - REQUIRED
# This project uses MongoDB Atlas cluster 'iceberg' at: iceberg.ciyct1a.mongodb.net
ICEBERGDB="mongodb+srv://berkozerdogan_db_user:021320@iceberg.ciyct1a.mongodb.net/?appName=Iceberg"

# Node Environment
NODE_ENV=development
```

**Connection Details**:
- **Cluster**: iceberg (MongoDB Atlas)
- **Database**: Iceberg
- **User**: berkozerdogan_db_user
- **Connection String**: `mongodb+srv://berkozerdogan_db_user:021320@iceberg.ciyct1a.mongodb.net/?appName=Iceberg`

**Important Security Notes**:
- Replace `<your-username>` and `<your-password>` with your MongoDB Atlas credentials
- Never commit `.env` file to version control (it's in `.gitignore`)
- Use strong passwords for MongoDB Atlas
- Whitelist your IP address in MongoDB Atlas (Security → Network Access)

### Verify Connection

Once `.env` is set up, the application will automatically connect on startup. You should see:
```
MongoDB connection successful
[NestFactory] Starting Nest application...
Listening on port 3000
```

## Running the Project

### Development Mode (with auto-reload)

```bash
npm run start:dev
```

The server will start on `http://localhost:3000` and restart automatically when files change.

### Production Mode

```bash
# Build the project
npm run build

# Run production build
npm run start:prod
```

### Debug Mode

```bash
npm run start:debug
```

This starts the debugger on port 9229. Connect with your IDE's debugger.

## Running Tests

### Run All Tests

```bash
npm test
```

Runs all unit tests (both `src/**/*.spec.ts` and `test/**/*.spec.ts`):
- `src/transaction/transaction.service.spec.ts` - Service unit tests (11 tests)
- `src/transaction/transaction.controller.spec.ts` - Controller unit tests (8 tests)

### Watch Mode (re-run on file changes)

```bash
npm run test:watch
```

### Test Coverage Report

```bash
npm run test:cov
```

Generates a coverage report in the `coverage/` directory showing:
- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

### E2E Tests

```bash
npm run test:e2e
```

Runs end-to-end tests (configured in `test/jest-e2e.json`).

### Run Specific Test File

```bash
# Run controller tests only
npx jest --runTestsByPath ./src/transaction/transaction.controller.spec.ts

# Run service tests only
npx jest --runTestsByPath ./src/transaction/transaction.service.spec.ts

# Run tests matching a pattern
npm test -- -t "createTransaction"
```

## API Endpoints

### Base URL
- **Development**: `http://localhost:3000`
- **Production (Live)**: `https://berkozerdogan-task.vercel.app`
- **Deployment Platform**: Vercel (serverless Node.js)

### Health Check Endpoint

#### Health Status
```http
GET /health

Response: 200 OK
{
  "status": "ok",
  "message": "Transaction Management API is running",
  "timestamp": "2024-12-02T10:30:00.000Z"
}
```

### Transaction Endpoints (RESTful)

#### Create Transaction
```http
POST /transactions
Content-Type: application/json

{
  "totalServiceFee": 1000,
  "listingAgent": "Alice",
  "sellingAgent": "Bob"
}

Response: 201 Created
{
  "_id": "507f1f77bcf86cd799439011",
  "totalServiceFee": 1000,
  "listingAgent": "Alice",
  "sellingAgent": "Bob",
  "stage": "agreement",
  "financialBreakdown": {
    "agency": 500,
    "listingAgent": 250,
    "sellingAgent": 250
  },
  "commissionDetail": "",
  "stageHistory": [
    {
      "stage": "agreement",
      "changes": {
        "totalServiceFee": 1000,
        "listingAgent": "Alice",
        "sellingAgent": "Bob"
      },
      "updatedAt": "2024-12-02T10:30:00.000Z"
    }
  ]
}
```

#### Get All Transactions
```http
GET /transactions

Response: 200 OK
[
  { /* transaction object */ },
  { /* transaction object */ }
]
```

#### Get Single Transaction
```http
GET /transactions/:id

Response: 200 OK
{ /* transaction object */ }

Error Response: 404 Not Found
{
  "statusCode": 404,
  "message": "Transaction with id <id> not found"
}
```

#### Update Transaction Stage
```http
PATCH /transactions/:id
Content-Type: application/json

{
  "stage": "earnest_money",
  "earnest_money": 300
}

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439011",
  "totalServiceFee": 1000,
  "stage": "earnest_money",
  "financialBreakdown": { ... },
  "stageHistory": [
    {
      "stage": "earnest_money",
      "changes": { "earnest_money": 300 },
      "updatedAt": "2024-12-02T10:30:00Z"
    }
  ]
}

Error Response: 400 Bad Request
{
  "statusCode": 400,
  "message": "Invalid stage transition: You cannot jump from 'agreement' to 'completed'..."
}
```

### Transaction Stages

1. **agreement** - Initial stage
2. **earnest_money** - Earnest money deposited
3. **title_deed** - Title deed prepared
4. **completed** - Transaction completed

## Deployment

### Prerequisites for Deployment
- MongoDB Atlas account with a running cluster
- Deployment platform account (Render, Railway, or Fly.io)
- Git repository pushed to GitHub
- `.env` variables configured for your environment

### Option 1: Deploy to Render (Recommended - Free Tier Available)

**Live API URL** (when deployed): `https://berkozerdogan-task.onrender.com`

1. **Push your code to GitHub**:
   ```bash
   git remote add origin https://github.com/yourusername/berkozerdogan-task.git
   git push -u origin master
   ```

2. **Create Render Account**:
   - Go to [Render](https://render.com)
   - Sign up with GitHub
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Render Service**:
   - **Name**: `berkozerdogan-task`
   - **Branch**: `master`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Environment**: Node
   - **Instance Type**: Free

4. **Set Environment Variables** in Render Dashboard:
   ```
   ICEBERGDB=mongodb+srv://<username>:<password>@cluster.xxxxx.mongodb.net/Iceberg
   PORT=3000
   NODE_ENV=production
   ```

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment to complete (~2-3 minutes)
   - Your API will be available at the provided URL

6. **Verify Deployment**:
   ```bash
   curl https://your-render-url.onrender.com/health
   ```

### Option 2: Deploy to Railway

1. **Create Railway Account**:
   - Go to [Railway](https://railway.app)
   - Sign in with GitHub

2. **Create New Project**:
   - Click "Create Project"
   - Select "GitHub Repo"
   - Choose `berkozerdogan-task` repository

3. **Add MongoDB Atlas**:
   - In Railway, click "Add Service" → "MongoDB"
   - Configure plugin with MongoDB Atlas credentials

4. **Configure Environment Variables**:
   - `ICEBERGDB`: Your MongoDB Atlas URI
   - `NODE_ENV`: production
   - `PORT`: 3000

5. **Deploy**:
   - Railway automatically deploys on GitHub push
   - View logs and URL in Railway dashboard

### Option 3: Deploy to Fly.io

1. **Install Fly CLI**:
   ```bash
   npm install -g @fly/cli
   fly auth login
   ```

2. **Create Fly App**:
   ```bash
   fly launch
   ```
   - Choose app name: `berkozerdogan-task`
   - Choose region closest to you

3. **Set Secrets**:
   ```bash
   fly secrets set ICEBERGDB=mongodb+srv://...
   fly secrets set NODE_ENV=production
   ```

4. **Deploy**:
   ```bash
   fly deploy
   ```

5. **View Application**:
   ```bash
   fly open
   ```

### Health Check After Deployment

Once deployed, verify the API is running:

```bash
# Health endpoint
curl https://your-deployed-url.com/health

# Expected response:
# {
#   "status": "ok",
#   "message": "Transaction Management API is running",
#   "timestamp": "2024-12-02T10:30:00.000Z"
# }

# Test create transaction
curl -X POST https://your-deployed-url.com/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "totalServiceFee": 1000,
    "listingAgent": "Alice",
    "sellingAgent": "Bob"
  }'
```

### Deployment Troubleshooting

- **Build fails**: Check `package.json` scripts and ensure `npm run build` works locally
- **MongoDB connection fails**: Verify `ICEBERGDB` URI is correct and IP is whitelisted in Atlas
- **Port issues**: Platform automatically assigns PORT, ensure your code uses `process.env.PORT`
- **Out of memory**: Upgrade to paid tier or optimize database queries

## Project Structure

```
berkozerdogan-task/
├── src/
│   ├── app.controller.ts           # Main application controller
│   ├── app.module.ts               # Root application module
│   ├── app.service.ts              # Main application service
│   ├── main.ts                     # Application entry point
│   ├── health/
│   │   ├── health.controller.ts    # Health check endpoint
│   │   └── health.module.ts        # Health module
│   └── transaction/
│       ├── dto/
│       │   ├── create-transaction.dto.ts    # DTO for creating transactions
│       │   ├── update-transaction.dto.ts    # DTO for updating transactions
│       │   └── index.ts                     # DTO exports
│       ├── schemas/
│       │   └── transaction.schema.ts        # Mongoose schema definition
│       ├── transaction.controller.ts        # Transaction controller (RESTful)
│       ├── transaction.service.ts           # Transaction business logic
│       └── transaction.module.ts            # Transaction module
├── test/
│   ├── transaction.service.spec.ts # Service unit tests
│   ├── transaction.controller.spec.ts # Controller unit tests
│   ├── app.e2e-spec.ts             # E2E tests
│   └── jest-e2e.json               # E2E Jest config
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── eslint.config.mjs               # ESLint configuration
├── nest-cli.json                   # NestJS CLI configuration
├── package.json                    # Project dependencies
├── tsconfig.json                   # TypeScript configuration
├── tsconfig.build.json             # TypeScript build configuration
├── DESIGN.md                       # Architecture and design decisions
├── README.md                       # This file
└── README_OLD.md                   # Previous documentation
```

## Development Commands

```bash
# Code formatting
npm run format

# ESLint with auto-fix
npm run lint

# Build project
npm run build

# Start development server
npm run start:dev

# Run tests with watch
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## Common Issues and Solutions

### MongoDB Connection Error

**Error**: `MongooseError: Cannot connect to MongoDB`

**Solution**:
- Check MongoDB Atlas connection string in `.env`
- Verify credentials are correct
- Whitelist your IP in MongoDB Atlas (Security → Network Access)
- Ensure MongoDB Atlas cluster is running

### Port Already in Use

**Error**: `Error: listen EADDRINUSE :::3000`

**Solution**:
```bash
# Kill process on port 3000
# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On macOS/Linux:
lsof -i :3000
kill -9 <PID>
```

### Tests Fail with "Cannot find module"

**Error**: `Cannot find module '../src/transaction/...'`

**Solution**:
```bash
# Clear Jest cache
npm test -- --clearCache

# Reinstall node_modules
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a pull request

## License

This project is licensed under the UNLICENSED license.

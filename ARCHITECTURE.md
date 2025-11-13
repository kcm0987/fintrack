# React Expense Dashboard - System Architecture

## Overview
The expense dashboard is a full-stack application built with React frontend, AWS Amplify authentication, and serverless backend infrastructure using Lambda functions and DynamoDB.

---

## Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (React)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           React Application (src/App.js)                │   │
│  │                                                          │   │
│  │  ├─ Authenticator (AWS Amplify UI)                     │   │
│  │  │  └─ Manages User Login/Signup                       │   │
│  │  │                                                      │   │
│  │  └─ Dashboard Component (src/pages/Dashboard.js)       │   │
│  │     ├─ Add Expense Form                                │   │
│  │     ├─ Expenses Table                                  │   │
│  │     ├─ Receipt Management                              │   │
│  │     ├─ Profile Dropdown                                │   │
│  │     └─ Statistics Cards                                │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ▼                                     │
│                    AWS Amplify Auth SDK                           │
│                   (Manages user tokens)                           │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  HTTP/HTTPS Endpoints (REST API):                               │
│  • POST   /addExpense          → Lambda: addExpense             │
│  • GET    /getExpenses/{userId} → Lambda: getExpenses           │
│  • DELETE /deleteExpense/{userId}/{expenseId} → Lambda: delete  │
│  • GET    /testJson            → Lambda: testJson (Debug)       │
│                                                                   │
│  Features:                                                       │
│  • CORS Enabled (Access from frontend)                          │
│  • Path Parameter Routing ({userId}, {expenseId})               │
│  • Content-Type: application/json                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAMBDA FUNCTIONS LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. addExpense (lambda/addExpense/index.js)                     │
│     • Input: { category, amount, date, notes, userId }          │
│     • Validates required fields                                 │
│     • Generates unique expenseId (UUID)                         │
│     • Stores in DynamoDB (expenses_table)                       │
│     • Returns: { expenseId, timestamp, success }                │
│                                                                   │
│  2. getExpenses (lambda/getExpenses/index.js)                   │
│     • Input: userId (from path parameter)                       │
│     • Queries DynamoDB for user's expenses                      │
│     • Returns: [ { expenseId, category, amount, date, ... } ]   │
│     • Error: Returns empty array if user has no expenses        │
│                                                                   │
│  3. deleteExpense (lambda/deleteExpense/index.js)               │
│     • Input: userId, expenseId (from path parameters)           │
│     • Validates user ownership                                  │
│     • Deletes from DynamoDB                                     │
│     • Returns: { success, message }                             │
│                                                                   │
│  4. testJson (lambda/testJson/index.js) [Debug Only]            │
│     • Used for debugging API Gateway data flow                  │
│     • Returns: Full event object for inspection                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER (DynamoDB)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Table: expenses_table                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Partition Key: userId (String)                          │    │
│  │ Sort Key:      expenseId (String)                       │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ Attributes:                                             │    │
│  │ • category       (String): "food", "transport", etc     │    │
│  │ • amount         (Number): Expense amount               │    │
│  │ • date           (String): ISO format date              │    │
│  │ • notes          (String): Optional description         │    │
│  │ • receiptUrl     (String): S3 URL for receipt file      │    │
│  │ • timestamp      (Number): Epoch timestamp              │    │
│  │ • createdAt      (String): ISO timestamp                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Query Pattern:                                                 │
│  • Get user expenses: Query by userId                           │
│  • Delete expense: Delete by userId + expenseId                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 STORAGE LAYER (AWS S3)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Bucket: expense-receipts (or configured bucket)                │
│  • Stores receipt images/documents                              │
│  • File naming: {userId}/{expenseId}.{ext}                      │
│  • Presigned URLs for access                                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

---

## Data Flow Diagrams

### 1. User Authentication Flow
\`\`\`
User
  ↓
[Login/Signup UI]
  ↓
AWS Amplify Authenticator
  ↓
Amazon Cognito
  ↓
JWT Token Generated
  ↓
App.js extracts userEmail + userName
  ↓
Pass to Dashboard component
  ↓
Dashboard initialized with user context
\`\`\`

### 2. Add Expense Flow
\`\`\`
User fills form (category, amount, date, notes, receipt)
  ↓
[Add Expense button]
  ↓
Dashboard.js → handleAddExpense()
  ↓
Upload receipt to S3 (if present)
  ↓
POST /addExpense (via API Gateway)
  ↓
Lambda: addExpense
  ├─ Validate inputs
  ├─ Generate expenseId (UUID)
  ├─ Insert into DynamoDB
  └─ Return success
  ↓
Refresh fetchExpenses()
  ↓
Display updated list
\`\`\`

### 3. Get Expenses Flow
\`\`\`
Dashboard mounts or userId changes
  ↓
useEffect triggers fetchExpenses()
  ↓
GET /getExpenses/{userId}
  ↓
Lambda: getExpenses
  ├─ Extract userId from path
  ├─ Query DynamoDB (userId = partition key)
  └─ Return expenses array
  ↓
setExpenses(data)
  ↓
Render expenses table
\`\`\`

### 4. Delete Expense Flow
\`\`\`
User clicks "Delete" button
  ↓
Confirmation dialog
  ↓
Dashboard.js → removeExpense()
  ↓
DELETE /deleteExpense/{userId}/{expenseId}
  ↓
Lambda: deleteExpense
  ├─ Validate userId + expenseId
  ├─ Delete from DynamoDB
  └─ Return success
  ↓
Refresh fetchExpenses()
  ↓
Update table UI
\`\`\`

---

## Component Structure

\`\`\`
src/
├── App.js                          # Entry point, Amplify setup, Auth wrapper
├── pages/
│   ├── Dashboard.js               # Main dashboard component
│   │   ├── Add Expense Form       # Form for new expenses
│   │   ├── Expenses Table         # Display all expenses
│   │   ├── Statistics             # Summary cards
│   │   ├── Profile Dropdown       # User menu
│   │   └── Receipt Management     # Upload/view receipts
│   └── Dashboard.css              # Styling
│
└── aws-exports.js                 # Amplify configuration (generated)

lambda/
├── addExpense/
│   ├── index.js                  # Handler for POST /addExpense
│   ├── package.json              # Dependencies (crypto module)
│   └── getExpenses.js            # Legacy file
│
├── getExpenses/
│   └── index.js                  # Handler for GET /getExpenses/{userId}
│
├── deleteExpense/
│   └── index.js                  # Handler for DELETE /deleteExpense/{userId}/{expenseId}
│
└── testJson/
    └── index.js                  # Debug Lambda for checking event structure
\`\`\`

---

## API Endpoints Reference

### 1. Add Expense
\`\`\`
Method: POST
Path: /addExpense
URL: https://{api-id}.execute-api.us-east-1.amazonaws.com/dev/addExpense

Request Body:
{
  "userId": "user@example.com",
  "category": "food",
  "amount": 25.50,
  "date": "2024-01-15",
  "notes": "Lunch with team",
  "receiptUrl": "s3://bucket/receipts/user@example.com/expense-123.jpg"
}

Response (Success):
{
  "statusCode": 200,
  "body": {
    "expenseId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": 1705358400,
    "success": true
  }
}

Response (Error):
{
  "statusCode": 400,
  "body": {
    "message": "Missing required parameter: userId"
  }
}
\`\`\`

### 2. Get Expenses
\`\`\`
Method: GET
Path: /getExpenses/{userId}
URL: https://{api-id}.execute-api.us-east-1.amazonaws.com/dev/getExpenses/user@example.com

Response (Success):
{
  "statusCode": 200,
  "body": [
    {
      "userId": "user@example.com",
      "expenseId": "550e8400-e29b-41d4-a716-446655440000",
      "category": "food",
      "amount": 25.50,
      "date": "2024-01-15",
      "notes": "Lunch with team",
      "timestamp": 1705358400,
      "receiptUrl": "s3://bucket/receipts/.../file.jpg"
    }
  ]
}
\`\`\`

### 3. Delete Expense
\`\`\`
Method: DELETE
Path: /deleteExpense/{userId}/{expenseId}
URL: https://{api-id}.execute-api.us-east-1.amazonaws.com/dev/deleteExpense/user@example.com/550e8400-e29b-41d4-a716-446655440000

Response (Success):
{
  "statusCode": 200,
  "body": {
    "success": true,
    "message": "Expense deleted successfully"
  }
}
\`\`\`

---

## Environment Variables & Configuration

### Frontend (React)
\`\`\`
REACT_APP_AWS_REGION=us-east-1
REACT_APP_AWS_USER_POOL_ID=us-east-1_xxxxxxxxx
REACT_APP_AWS_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
REACT_APP_AWS_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
REACT_APP_API_ENDPOINT=https://api-id.execute-api.us-east-1.amazonaws.com/dev
\`\`\`

### Lambda Environment Variables
\`\`\`
EXPENSES_TABLE=expenses_table
AWS_REGION=us-east-1
\`\`\`

---

## AWS Resources Required

| Resource | Purpose | Configuration |
|----------|---------|---|
| **Cognito User Pool** | User authentication | Email + Password auth |
| **Cognito Identity Pool** | AWS credentials for S3 access | Unauthenticated access enabled |
| **API Gateway** | REST endpoints | CORS enabled, Lambda proxy integration |
| **Lambda Functions** | Business logic | Node.js 18+, 256MB memory minimum |
| **DynamoDB Table** | Data storage | On-demand billing (auto-scaling) |
| **S3 Bucket** | Receipt storage | Private bucket with presigned URLs |
| **IAM Roles** | Permissions | Lambda → DynamoDB, S3 access |

---

## Security Considerations

1. **Authentication**: AWS Cognito handles user auth + JWT tokens
2. **Authorization**: Each user can only see their own expenses (userId validation)
3. **CORS**: API Gateway CORS headers prevent unauthorized cross-origin requests
4. **DynamoDB**: Row-level security through partition key (userId)
5. **S3**: Presigned URLs for time-limited receipt access
6. **Secrets**: AWS exports file (aws-exports.js) contains safe public config

---

## Deployment Architecture

\`\`\`
GitHub Repository
       ↓
[git push origin main]
       ↓
AWS Amplify Hosting
  ├─ Auto-builds on push
  ├─ Runs: npm run build
  ├─ Deploys to CloudFront (CDN)
  └─ Live URL: https://main.xxxxx.amplifyapp.com
       ↓
Lambda Functions (Serverless)
  ├─ Auto-scales based on requests
  ├─ No infrastructure to manage
  └─ Pays only for execution time
       ↓
DynamoDB (Managed Database)
  ├─ On-demand pricing
  ├─ Auto-scaling enabled
  └─ Automatic backups
\`\`\`

---

## Scalability & Performance

- **Frontend**: Hosted on Amplify + CloudFront (globally distributed)
- **API**: API Gateway with built-in rate limiting & caching
- **Lambda**: Auto-scales from 0 to thousands of concurrent executions
- **Database**: DynamoDB on-demand handles traffic spikes automatically
- **Storage**: S3 handles unlimited file uploads

---

## Future Enhancements

1. Add categories management
2. Expense analytics & dashboards
3. Bulk operations (multi-delete, export to CSV/PDF)
4. Expense sharing with other users
5. Recurring expenses
6. Budget limits & alerts
7. Mobile app (React Native)
8. Offline-first sync with AWS AppSync

---

## Monitoring & Debugging

- **CloudWatch Logs**: All Lambda execution logs
- **API Gateway Logs**: HTTP request/response details
- **DynamoDB Metrics**: Query performance & capacity usage
- **X-Ray**: Distributed tracing across services
- **Lambda testJson endpoint**: Debug API event structure

---

## Troubleshooting Guide

| Issue | Cause | Solution |
|-------|-------|----------|
| 404 Not Found | API Gateway not deployed | Redeploy API after creating resources |
| CORS Error | CORS headers missing | Enable CORS on API Gateway |
| userId empty | Not passed from App.js | Check Authenticator extracts email correctly |
| DynamoDB Error | Table doesn't exist | Create expenses_table with userId as partition key |
| Lambda timeout | Long-running query | Increase Lambda timeout to 30s |
| S3 access denied | IAM permissions missing | Add S3 put/get permissions to Lambda role |

# React Expense Dashboard - System Architecture

## Overview
The expense dashboard is a full-stack web application built with **React (frontend)**, **Ulify hosting**, and a **serverless backend** using **AWS Lambda**, **API Gateway**, **DynamoDB**, and **S3**.

---

## 🧩 Architecture Diagram

```text
┌────────────────────────────────────────────────────────────┐
│                 CLIENT LAYER (React)                       │
├────────────────────────────────────────────────────────────┤
│ React Application (src/App.js)                             │
│  ├─ Ulify-hosted frontend build                            │
│  ├─ User Authentication UI                                 │
│  └─ Dashboard (src/pages/Dashboard.js)                     │
│      ├─ Add Expense Form                                   │
│      ├─ Expenses Table                                     │
│      ├─ Receipt Management                                 │
│      ├─ Profile Dropdown                                   │
│      └─ Statistics Cards                                   │
│                                                            │
│ → Auth SDK (Handles login & user tokens)                   │
└────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│                 API GATEWAY LAYER (REST API)                │
├────────────────────────────────────────────────────────────┤
│ Endpoints:                                                  │
│  • POST   /addExpense             → Lambda: addExpense      │
│  • GET    /getExpenses/{userId}   → Lambda: getExpenses     │
│  • DELETE /deleteExpense/{userId}/{expenseId}               │
│  • GET    /testJson               → Lambda: testJson        │
│                                                              │
│ Features:                                                    │
│  • CORS enabled                                               │
│  • Path parameter routing ({userId}, {expenseId})             │
│  • JSON payloads (Content-Type: application/json)             │
└────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│                LAMBDA FUNCTIONS LAYER                      │
├────────────────────────────────────────────────────────────┤
│ 1️⃣ addExpense                                              │
│    • Validates input, creates UUID                          │
│    • Inserts record into DynamoDB                           │
│    • Returns success + timestamp                            │
│                                                            │
│ 2️⃣ getExpenses                                             │
│    • Fetches all expenses for userId                        │
│    • Returns expenses array                                 │
│                                                            │
│ 3️⃣ deleteExpense                                           │
│    • Validates ownership, deletes item                      │
│    • Returns confirmation message                           │
│                                                            │
│ 4️⃣ testJson (Debug)                                        │
│    • Returns full event object for inspection               │
└────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│                DATABASE LAYER (DynamoDB)                   │
├────────────────────────────────────────────────────────────┤
│ Table: expenses_table                                      │
│  • Partition Key: userId (String)                          │
│  • Sort Key: expenseId (String)                            │
│ Attributes:                                                │
│  • category   (String)   • amount   (Number)               │
│  • date       (String)   • notes    (String)               │
│  • receiptUrl (String)   • timestamp(Number)               │
│  • createdAt  (String)                                     │
│ Queries: Query by userId / Delete by userId + expenseId    │
└────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│                 STORAGE LAYER (AWS S3)                     │
├────────────────────────────────────────────────────────────┤
│ Bucket: expense-receipts                                   │
│  • Stores uploaded receipt images/docs                     │
│  • Path: {userId}/{expenseId}.{ext}                        │
│  • Access: Presigned URLs (temporary secure links)         │
└────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│              DEPLOYMENT & HOSTING (ULIFY)                  │
├────────────────────────────────────────────────────────────┤
│ • React app built with npm/yarn                            │
│ • Hosted on Ulify static web hosting                       │
│ • Backend hosted via AWS (Lambda + API Gateway)            │
│ • Continuous deployment via GitHub → Ulify build pipeline  │
│ • Global CDN delivery with HTTPS support                   │
└────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Data Flow Overview

### 🧾 Add Expense Flow
```text
User → Dashboard Form → POST /addExpense → Lambda addExpense
  ├─ Validate input
  ├─ Upload receipt (S3)
  ├─ Store record (DynamoDB)
  └─ Return success response → Update UI
```

### 🔍 Get Expenses Flow
```text
Dashboard mounts → GET /getExpenses/{userId} → Lambda getExpenses
  ├─ Query DynamoDB
  └─ Return expenses array → Render table
```

### 🗑️ Delete Expense Flow
```text
User clicks delete → DELETE /deleteExpense/{userId}/{expenseId}
  ├─ Lambda validates request
  ├─ Deletes DynamoDB record
  └─ Returns confirmation → Refresh table
```

---

## 🧠 Key AWS Components

| Component | Purpose | Example |
|------------|----------|---------|
| **API Gateway** | REST API interface for frontend | `/addExpense`, `/getExpenses` |
| **Lambda** | Serverless compute | Handles logic for CRUD operations |
| **DynamoDB** | NoSQL database | Stores expense records |
| **S3** | File storage | Stores receipts and images |
| **Ulify** | Hosting platform | Hosts static frontend and connects to backend |

---

## 🔐 Security Highlights

- User-level data isolation using `userId` as partition key  
- API Gateway with CORS and HTTPS enforcement  
- Presigned URLs for secure receipt uploads  
- IAM roles for least-privilege Lambda → S3/DynamoDB access  

---

## 🚀 Scalability & Performance

- Ulify CDN ensures global low-latency delivery  
- API Gateway auto-scales with Lambda concurrency  
- DynamoDB on-demand scaling supports high request volumes  
- S3 scales for unlimited file storage  

---

## 🧭 Future Enhancements
1. Expense analytics dashboard  
2. Budget limit alerts  
3. CSV/PDF export options  
4. Category management  
5. Mobile version (React Native)

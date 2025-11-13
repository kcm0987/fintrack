// AWS Lambda Function for Adding Expenses
// This function accepts POST requests with expense data and stores it in DynamoDB

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
import { randomUUID } from "crypto"

const client = new DynamoDBClient({})
const dynamodb = DynamoDBDocumentClient.from(client)
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses"

// Helper function to return CORS-enabled responses
const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  },
  body: JSON.stringify(body),
})

// Main handler function
export const handler = async (event) => {
  console.log("[v0] Incoming event:", JSON.stringify(event))
  console.log("[v0] Using EXPENSES_TABLE:", EXPENSES_TABLE)

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" })
  }

  try {
    // Parse the request body
    let body = event.body
    if (typeof body === "string") {
      body = JSON.parse(body)
    }

    console.log("[v0] Parsed body:", body)

    // Validate required fields
    if (!body.category || !body.amount || !body.userId) {
      return createResponse(400, {
        message: "Missing required fields: category, amount, userId",
      })
    }

    // Create expense object
    const expense = {
      expenseId: randomUUID(),
      userId: body.userId,
      category: body.category,
      amount: Number.parseFloat(body.amount).toFixed(2),
      date: body.date || new Date().toISOString().split("T")[0],
      receiptUrl: body.receiptUrl || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    console.log("[v0] Creating expense:", expense)

    // Save to DynamoDB
    await dynamodb.send(
      new PutCommand({
        TableName: EXPENSES_TABLE,
        Item: expense,
      }),
    )

    console.log("[v0] Expense created successfully")

    return createResponse(201, {
      message: "Expense added successfully",
      expense,
    })
  } catch (error) {
    console.error("[v0] Error in addExpense handler:", error)
    console.error("[v0] Error stack:", error.stack)
    console.error("[v0] Error code:", error.code)
    console.error("[v0] Error name:", error.name)

    // Handle specific error types
    if (error.code === "ValidationException") {
      return createResponse(400, {
        message: "Invalid request format",
        error: error.message,
      })
    }

    if (error.code === "AccessDeniedException") {
      return createResponse(403, {
        message: "Permission denied: Unable to write to DynamoDB",
        error: error.message,
      })
    }

    return createResponse(500, {
      message: "Internal server error",
      error: error.message,
      errorCode: error.code,
      errorName: error.name,
    })
  }
}

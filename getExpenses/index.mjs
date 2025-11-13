import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb"

const client = new DynamoDBClient({})
const dynamodb = DynamoDBDocumentClient.from(client)
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses"

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

export const handler = async (event) => {
  console.log("[v1] Received event:", JSON.stringify(event, null, 2))

  // Handle preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" })
  }

  let userId = null

  try {
    // --- Extract userId robustly ---
    if (event.queryStringParameters?.userId) {
      userId = event.queryStringParameters.userId
    } else if (event.rawQueryString) {
      const params = new URLSearchParams(event.rawQueryString)
      userId = params.get("userId")
    } else if (event.pathParameters?.userId) {
      userId = event.pathParameters.userId
    } else if (event.requestContext?.http?.path) {
      // fallback if API Gateway provides raw path
      const match = event.requestContext.http.path.match(/userId=([^&]+)/)
      if (match) userId = decodeURIComponent(match[1])
    } else if (event.multiValueQueryStringParameters?.userId) {
      userId = event.multiValueQueryStringParameters.userId[0]
    }

    console.log("[v1] Extracted userId:", userId)

    if (!userId || userId === "null" || userId.trim() === "") {
      return createResponse(400, {
        message: "Missing required parameter: userId",
        debug: {
          queryStringParameters: event.queryStringParameters,
          rawQueryString: event.rawQueryString,
          pathParameters: event.pathParameters,
          multiValueQueryStringParameters: event.multiValueQueryStringParameters,
          rawPath: event.requestContext?.http?.path,
        },
      })
    }

    // --- Query DynamoDB ---
    console.log(`[v1] Querying expenses for userId: ${userId}`)

    const queryParams = {
      TableName: EXPENSES_TABLE,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    }

    const result = await dynamodb.send(new QueryCommand(queryParams))

    console.log("[v1] QueryCommand returned:", result.Items?.length || 0, "items")

    // --- Optional fallback: full table scan (debug use only) ---
    if (!result.Items || result.Items.length === 0) {
      console.warn("[v1] No items found with QueryCommand, attempting ScanCommand for debugging")
      const scanResult = await dynamodb.send(new ScanCommand({ TableName: EXPENSES_TABLE }))
      console.log("[v1] ScanCommand returned:", scanResult.Items?.length || 0, "items in total")
      console.log("[v1] First few items:", JSON.stringify(scanResult.Items?.slice(0, 3), null, 2))
    }

    return createResponse(200, result.Items || [])
  } catch (error) {
    console.error("[v1] Error in handler:", error)

    const errorResponse = {
      message: "Internal server error",
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    }

    if (error.name === "AccessDeniedException") {
      return createResponse(403, {
        message: "Permission denied: Unable to read from DynamoDB",
        error: error.message,
      })
    }

    return createResponse(500, errorResponse)
  }
}

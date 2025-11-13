import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

const client = new DynamoDBClient({ region: "us-east-1" })
const ddbDocClient = DynamoDBDocumentClient.from(client)

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "DELETE,OPTIONS,GET"
  }

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ message: "CORS preflight response" }) }
  }

  try {
    const userId = event.queryStringParameters?.userId || event.pathParameters?.userId || "user123"
    const expenseId = event.queryStringParameters?.expenseId || event.pathParameters?.expenseId

    if (!expenseId || !userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: "Missing userId or expenseId parameter" }) }
    }

    const deleteParams = {
      TableName: "Expenses",
      Key: { userId, expenseId },
      ReturnValues: "ALL_OLD"
    }

    const result = await ddbDocClient.send(new DeleteCommand(deleteParams))

    if (!result.Attributes) {
      return { statusCode: 404, headers, body: JSON.stringify({ message: "Expense not found or already deleted" }) }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Expense deleted successfully", deletedItem: result.Attributes })
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Error removing expense", error: err.message })
    }
  }
}

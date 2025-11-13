import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Initialize clients
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

// Table name for expenses
const EXPENSES_TABLE = 'Expenses';

// Hardcoded userId
const USER_ID = 'user123';

export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,PUT,GET,DELETE'
    };

    try {
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'CORS enabled' })
            };
        }

        // Parse request body and log it for debugging
        let requestBody = {};
        try {
            requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (err) {
            console.error('Invalid JSON in request body:');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON in request body' })
            };
        }

        if (!requestBody.expenseId) {
            console.error('Missing expenseId in request body');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Expense ID is required' })
            };
        }

        const updateExpressions = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        // Modified to handle required fields only (receiptUrl is now optional)
        const allowedFields = ['category', 'amount', 'date'];

        // Check if receiptUrl exists in request and add it to allowed fields
        if ('receiptUrl' in requestBody) {
            allowedFields.push('receiptUrl');
        }

        for (const key of allowedFields) {
            if (key in requestBody) {
                updateExpressions.push(`#${key} = :${key}`);
                expressionAttributeNames[`#${key}`] = key;
                expressionAttributeValues[`:${key}`] = requestBody[key];
            }
        }

        if (updateExpressions.length === 0) {
            console.error('No fields to update');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'No fields to update' })
            };
        }

        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

        const params = {
            TableName: EXPENSES_TABLE,
            Key: {
                expenseId: requestBody.expenseId,
                userId: requestBody.userId || USER_ID, // Use provided userId or fallback to hardcoded value
            },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        console.log('DynamoDB update params:', JSON.stringify(params));

        const command = new UpdateCommand(params);
        const result = await docClient.send(command);

        console.log('Update successful, result:', JSON.stringify(result.Attributes));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Expense updated successfully',
                data: result.Attributes
            })
        };
    } catch (error) {
        console.error('Error updating expense:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: 'Failed to update expense',
                error: error.message
            })
        };
    }
};

import {CognitoIdentityServiceProvider, DynamoDB} from 'aws-sdk';
import { Handler } from 'aws-lambda';

const dynamodb = new DynamoDB.DocumentClient();

export const handler: Handler = async (event, context) => {
    try {
        // Get the user's attributes from the Cognito event
        const { name:name, 'custom:country':country,'custom:zipcode':zipCode, email, sub } = event.request.userAttributes;

        // Add the user to the "User" group
        await cognitoAdminAddUserToGroup(event.userPoolId, event.userName, 'User');

        // Create a new user record in the DynamoDB table
        await dynamodb.put({
            TableName: process.env.USER_TABLE as string,
            Item: {
                id:sub,
                email,
                name,
                country,
                zipCode,
                role: 'User',
            },
        }).promise();
    } catch (err) {
        console.error(err);
        throw new Error('Error creating user');
    }
    return event
};

async function cognitoAdminAddUserToGroup(userPoolId: string, username: string, groupName: string): Promise<void> {
    const cognito = new CognitoIdentityServiceProvider();
    const params = {
        GroupName: groupName,
        UserPoolId: userPoolId,
        Username: username,
    };
    await cognito.adminAddUserToGroup(params).promise();
}

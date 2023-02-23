import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import {Logger} from '@aws-lambda-powertools/logger'
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { parse } from '@aws-sdk/util-arn-parser';

const logger = new Logger()

export const handler = async function (event: APIGatewayTokenAuthorizerEvent, context: any, callback: (err: Error | null, result?: APIGatewayAuthorizerResult) => void): void {
    logger.info(event)
    const token: string = event.authorizationToken.split(' ')[1];
    const { resource } = parse(event.methodArn);
    try {
        const payload = await verifyToken(token);
        console.log("Token is valid. Payload:", payload);
        const groups:string[] = payload['cognito:groups']
        if (groups.includes('Admin')) {
            callback(null, generatePolicy('Admin', 'Allow', event.methodArn));
        } else if (groups.includes('User') && (resource.includes('GET')||resource.includes('POST'))) {
            callback(null, generatePolicy('User', 'Allow', event.methodArn));
        } else if (groups.includes('User') && resource.includes('DELETE')) {
            callback(null, generatePolicy('User', 'Deny', event.methodArn));
        } else {
            callback(new Error('Unauthorized'),{});
        }
    } catch(e) {
        console.log(`Token not valid! error:${e}`);
        callback(e as Error,{e});
    }
    callback(new Error('Unauthorized'),{});
};

async function verifyToken(token: string): Promise<any> {
    const verifier = CognitoJwtVerifier.create({
        tokenUse: 'access',
        userPoolId: process.env.USER_POOL_ID!,
        clientId: process.env.CLIENT_ID!,
    });
    const payload = await verifier.verify(token);
    return payload;
}
const generatePolicy = function(principalId: string, effect: string, resource: string): APIGatewayAuthorizerResult {
    const authResponse: APIGatewayAuthorizerResult = {
        principalId
    };
    if (effect && resource) {
        const policyDocument = {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource
                }
            ]
        };
        authResponse.policyDocument = policyDocument;
    }
    logger.info(authResponse)
    return authResponse;
}
